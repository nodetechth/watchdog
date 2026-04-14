import { LegalClaimType } from "@/types";

export type JobStatus = "pending" | "processing" | "done" | "error" | "expired";
export type UserPlan = "guest" | "free" | "paid";

export interface Job {
  jobId: string;
  status: JobStatus;
  url: string;
  evidenceNumber: string;
  evidenceType: LegalClaimType;
  customClaimText: string | null;
  pdfKey: string | null;
  docxKey: string | null;
  hashValue: string | null;
  capturedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  txHash?: string;
  explorerUrl?: string;
  userId?: string;
  userPlan?: UserPlan;
  expiresAt?: string;
  isPaid?: boolean;
}

export interface User {
  userId: string;
  email: string;
  name?: string;
  plan: UserPlan;
  createdAt: string;
  tickets?: number;
  ticketsExpiresAt?: string;
}

export interface JobCreateInput {
  jobId: string;
  url: string;
  evidenceNumber: string;
  evidenceType: LegalClaimType;
  customClaimText?: string | null;
  createdAt: string;
  userId?: string;
  userPlan?: UserPlan;
  expiresAt?: string;
  isPaid?: boolean;
}

export interface JobStore {
  createJob(input: JobCreateInput): Promise<void>;
  getJob(jobId: string): Promise<Job | null>;
  updateJob(jobId: string, updates: Partial<Job>): Promise<void>;
  listJobsByUser(userId: string): Promise<Job[]>;
  listAllJobs(): Promise<Job[]>;
  deleteJob(jobId: string): Promise<void>;
}

export interface UserStore {
  getUser(userId: string): Promise<User | null>;
  createUser(user: User): Promise<void>;
  updateUser(userId: string, updates: Partial<User>): Promise<void>;
}

export interface BlobStore {
  save(key: string, data: Buffer, contentType: string): Promise<string>;
  getDownloadUrl(key: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// Verification Token types
export interface VerificationToken {
  id: string;
  jobId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  isRevoked: boolean;
}

export interface VerificationTokenCreateInput {
  jobId: string;
  createdBy: string;
  expiresAt: string;
}

export interface VerificationTokenStore {
  createToken(input: VerificationTokenCreateInput): Promise<VerificationToken>;
  getTokenByToken(token: string): Promise<VerificationToken | null>;
  getTokenByJobId(jobId: string): Promise<VerificationToken | null>;
  revokeTokensByJobId(jobId: string): Promise<void>;
}
