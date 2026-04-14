import { kv } from "@vercel/kv";
import { Job, JobCreateInput, JobStore } from "../types";

const JOB_TTL_SECONDS = 60 * 60 * 24 * 365 * 5; // 5 years max (TTL managed by expiresAt)

function jobKey(jobId: string): string {
  return `job:${jobId}`;
}

function userJobsKey(userId: string): string {
  return `user_jobs:${userId}`;
}

function allJobsKey(): string {
  return "all_jobs";
}

export const vercelJobStore: JobStore = {
  async createJob(input: JobCreateInput): Promise<void> {
    const job: Job = {
      jobId: input.jobId,
      status: "pending",
      url: input.url,
      evidenceNumber: input.evidenceNumber,
      evidenceType: input.evidenceType,
      customClaimText: input.customClaimText ?? null,
      pdfKey: null,
      docxKey: null,
      hashValue: null,
      capturedAt: null,
      createdAt: input.createdAt,
      errorMessage: null,
      userId: input.userId,
      userPlan: input.userPlan ?? "guest",
      expiresAt: input.expiresAt,
      isPaid: input.isPaid ?? false,
    };

    await kv.set(jobKey(input.jobId), job, { ex: JOB_TTL_SECONDS });

    // Add to user's job list if userId exists
    if (input.userId) {
      await kv.sadd(userJobsKey(input.userId), input.jobId);
    }

    // Add to all jobs set for cleanup
    await kv.sadd(allJobsKey(), input.jobId);
  },

  async getJob(jobId: string): Promise<Job | null> {
    const job = await kv.get<Job>(jobKey(jobId));
    return job;
  },

  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    const existingJob = await kv.get<Job>(jobKey(jobId));

    if (!existingJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob: Job = {
      ...existingJob,
      ...updates,
    };

    await kv.set(jobKey(jobId), updatedJob, { ex: JOB_TTL_SECONDS });
  },

  async listJobsByUser(userId: string): Promise<Job[]> {
    const jobIds = await kv.smembers<string[]>(userJobsKey(userId));
    if (!jobIds || jobIds.length === 0) return [];

    const jobs: Job[] = [];
    for (const jobId of jobIds) {
      const job = await kv.get<Job>(jobKey(jobId));
      if (job) {
        jobs.push(job);
      }
    }

    // Sort by createdAt descending
    return jobs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async listAllJobs(): Promise<Job[]> {
    const jobIds = await kv.smembers<string[]>(allJobsKey());
    if (!jobIds || jobIds.length === 0) return [];

    const jobs: Job[] = [];
    for (const jobId of jobIds) {
      const job = await kv.get<Job>(jobKey(jobId));
      if (job) {
        jobs.push(job);
      }
    }

    return jobs;
  },

  async deleteJob(jobId: string): Promise<void> {
    const job = await kv.get<Job>(jobKey(jobId));

    if (job) {
      // Remove from user's job list
      if (job.userId) {
        await kv.srem(userJobsKey(job.userId), jobId);
      }

      // Remove from all jobs set
      await kv.srem(allJobsKey(), jobId);

      // Delete the job itself
      await kv.del(jobKey(jobId));
    }
  },
};
