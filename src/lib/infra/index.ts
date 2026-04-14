import type { JobStore, BlobStore, UserStore } from "./types";

export type { Job, JobStatus, JobCreateInput, JobStore, BlobStore, User, UserStore, UserPlan } from "./types";

const provider = process.env.INFRA_PROVIDER ?? "vercel";

let jobStore: JobStore;
let blobStore: BlobStore;
let userStore: UserStore;

if (provider === "aws") {
  // Dynamic import to avoid loading AWS SDK when using Vercel
  const { awsJobStore } = require("./aws/job-store");
  const { awsBlobStore } = require("./aws/blob-store");
  jobStore = awsJobStore;
  blobStore = awsBlobStore;
  // AWS user store not implemented - use Vercel as fallback
  const { vercelUserStore } = require("./vercel/user-store");
  userStore = vercelUserStore;
} else {
  // Default to Vercel
  const { vercelJobStore } = require("./vercel/job-store");
  const { vercelBlobStore } = require("./vercel/blob-store");
  const { vercelUserStore } = require("./vercel/user-store");
  jobStore = vercelJobStore;
  blobStore = vercelBlobStore;
  userStore = vercelUserStore;
}

export { jobStore, blobStore, userStore };
