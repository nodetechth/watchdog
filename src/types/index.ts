// 立証趣旨の種類
export type LegalClaimType =
  | "defamation"      // 名誉毀損
  | "insult"          // 侮辱
  | "privacy"         // プライバシー侵害
  | "custom";         // カスタム

// キャプチャ結果
export interface CaptureResult {
  id: string;
  url: string;
  capturedAt: string;
  hash: string;
  pdfUrl: string;
  docxUrl: string;
  postText?: string;
  posterId?: string;
  postedAt?: string;
}

// 証拠説明書データ
export interface EvidenceDocument {
  evidenceNumber: string;         // 甲第X号証
  capturedAt: string;             // 取得日時
  url: string;                    // 取得URL
  hash: string;                   // SHA-256ハッシュ
  claimType: LegalClaimType;      // 立証趣旨タイプ
  claimText: string;              // 立証趣旨本文
  additionalNotes?: string;       // 補足事項
}

// Firestoreに保存する証拠記録
export interface EvidenceRecord {
  id: string;
  url: string;
  hash: string;
  capturedAt: string;
  pdfStoragePath: string;
  docxStoragePath?: string;
  metadata?: {
    postText?: string;
    posterId?: string;
    postedAt?: string;
  };
  // 将来のRFC3161タイムスタンプ用
  timestampToken?: string;
  timestampAuthority?: string;
}

// APIリクエスト/レスポンス型
export interface CaptureRequest {
  url: string;
  claimType?: LegalClaimType;
}

export interface CaptureResponse {
  success: boolean;
  hash: string;
  pdfUrl: string;
  docxUrl: string;
  capturedAt: string;
  postText?: string;
  error?: string;
}

export interface GenerateDocRequest {
  evidenceNumber: string;
  url: string;
  hash: string;
  capturedAt: string;
  claimType: LegalClaimType;
  customClaimText?: string;
}

// プロセス状態
export type ProcessState =
  | "idle"
  | "capturing"
  | "processing"
  | "generating"
  | "done"
  | "error";

// ジョブステータス
export type JobStatus = "pending" | "processing" | "done" | "error";

// Firestoreジョブドキュメント
export interface JobDocument {
  jobId: string;
  status: JobStatus;
  url: string;
  evidenceNumber: string;
  evidenceType: LegalClaimType;
  customClaimText?: string;
  pdfUrl: string | null;
  docxUrl: string | null;
  hashValue: string | null;
  capturedAt: Date | null;
  createdAt: Date;
  errorMessage: string | null;
}
