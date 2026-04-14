import type { JobStore, BlobStore, UserStore, VerificationTokenStore } from "./types";

export type { Job, JobStatus, JobCreateInput, JobStore, BlobStore, User, UserStore, UserPlan, VerificationToken, VerificationTokenCreateInput, VerificationTokenStore } from "./types";

const provider = process.env.INFRA_PROVIDER ?? "vercel";

let jobStore: JobStore;
let blobStore: BlobStore;
let userStore: UserStore;
let verificationTokenStore: VerificationTokenStore;

if (provider === "aws") {
  // Dynamic import to avoid loading AWS SDK when using Vercel
  const { awsJobStore } = require("./aws/job-store");
  const { awsBlobStore } = require("./aws/blob-store");
  jobStore = awsJobStore;
  blobStore = awsBlobStore;
  // AWS user store not implemented - use Vercel as fallback
  const { vercelUserStore } = require("./vercel/user-store");
  const { vercelVerificationTokenStore } = require("./vercel/verification-token-store");
  userStore = vercelUserStore;
  verificationTokenStore = vercelVerificationTokenStore;
} else {
  // Default to Vercel
  const { vercelJobStore } = require("./vercel/job-store");
  const { vercelBlobStore } = require("./vercel/blob-store");
  const { vercelUserStore } = require("./vercel/user-store");
  const { vercelVerificationTokenStore } = require("./vercel/verification-token-store");
  jobStore = vercelJobStore;
  blobStore = vercelBlobStore;
  userStore = vercelUserStore;
  verificationTokenStore = vercelVerificationTokenStore;
}

export { jobStore, blobStore, userStore, verificationTokenStore };
