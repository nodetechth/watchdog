import { initializeApp, getApps, cert, applicationDefault, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

/**
 * Firebase Admin SDK initialization for server-side operations
 *
 * Supports two authentication methods:
 *
 * 1. Service Account Key (for Vercel):
 *    Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * 2. Application Default Credentials (for Cloud Run / local with gcloud auth):
 *    If no key is provided, falls back to ADC
 *
 * Required environment variables:
 * - FIREBASE_PROJECT_ID (required for both methods)
 * - FIREBASE_STORAGE_BUCKET (optional)
 * - FIREBASE_CLIENT_EMAIL (only for method 1)
 * - FIREBASE_PRIVATE_KEY (only for method 1, base64 encoded or raw with \n)
 *
 * Set these in .env.local and Vercel dashboard.
 */

let app: App;
let db: Firestore;
let storage: Storage;

function getPrivateKey(): string | null {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) {
    return null;
  }
  // Handle both base64 encoded and raw keys with escaped newlines
  if (key.includes("-----BEGIN")) {
    return key.replace(/\\n/g, "\n");
  }
  // Assume base64 encoded
  return Buffer.from(key, "base64").toString("utf-8");
}

export function initFirebaseAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    const privateKey = getPrivateKey();

    if (!projectId) {
      throw new Error("FIREBASE_PROJECT_ID is not configured");
    }

    // Use service account key if available, otherwise fall back to ADC
    if (clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      });
    } else {
      // Use Application Default Credentials (ADC)
      // Works on Cloud Run, GCE, or locally with `gcloud auth application-default login`
      app = initializeApp({
        credential: applicationDefault(),
        projectId,
        storageBucket,
      });
    }
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  storage = getStorage(app);

  return { app, db, storage };
}

export function getAdminDb(): Firestore {
  if (!db) initFirebaseAdmin();
  return db;
}

export function getAdminStorage(): Storage {
  if (!storage) initFirebaseAdmin();
  return storage;
}
