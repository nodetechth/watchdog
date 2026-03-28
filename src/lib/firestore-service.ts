import {
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getDb, getStorageInstance } from "./firebase";
import { EvidenceRecord } from "@/types";

const EVIDENCE_COLLECTION = "evidence_records";

/**
 * 証拠記録をFirestoreに保存
 */
export async function saveEvidenceRecord(
  record: Omit<EvidenceRecord, "id">
): Promise<string> {
  const db = getDb();
  const docRef = doc(collection(db, EVIDENCE_COLLECTION));

  await setDoc(docRef, {
    ...record,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 証拠記録を取得
 */
export async function getEvidenceRecord(
  id: string
): Promise<EvidenceRecord | null> {
  const db = getDb();
  const docRef = doc(db, EVIDENCE_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as EvidenceRecord;
}

/**
 * PDFをFirebase Storageにアップロード
 */
export async function uploadPdfToStorage(
  pdfBuffer: Buffer,
  filename: string
): Promise<string> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, `evidence/${filename}`);

  await uploadBytes(storageRef, pdfBuffer, {
    contentType: "application/pdf",
  });

  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

/**
 * DOCXをFirebase Storageにアップロード
 */
export async function uploadDocxToStorage(
  docxBuffer: Buffer,
  filename: string
): Promise<string> {
  const storage = getStorageInstance();
  const storageRef = ref(storage, `documents/${filename}`);

  await uploadBytes(storageRef, docxBuffer, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
