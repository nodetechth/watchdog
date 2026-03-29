import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

/**
 * Firebase Admin SDK initialization for server-side operations
 *
 * Required environment variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (base64 encoded or raw with \n)
 * - FIREBASE_STORAGE_BUCKET
 *
 * Set these in .env.local and Vercel dashboard.
 */

let app: App;
let db: Firestore;
let storage: Storage;

function getPrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) {
    throw new Error("FIREBASE_PRIVATE_KEY is not set");
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

    if (!projectId || !clientEmail) {
      throw new Error("Firebase Admin credentials are not configured");
    }

    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: getPrivateKey(),
      }),
      storageBucket,
    });
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
