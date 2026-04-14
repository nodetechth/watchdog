import { kv } from "@vercel/kv";
import { v4 as uuidv4 } from "uuid";
import {
  VerificationToken,
  VerificationTokenCreateInput,
  VerificationTokenStore,
} from "../types";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 8; // 8 days (slightly longer than 7-day validity)

function tokenKey(token: string): string {
  return `vtoken:${token}`;
}

function jobTokenKey(jobId: string): string {
  return `vtoken_job:${jobId}`;
}

export const vercelVerificationTokenStore: VerificationTokenStore = {
  async createToken(
    input: VerificationTokenCreateInput
  ): Promise<VerificationToken> {
    const id = uuidv4();
    const token = uuidv4();
    const createdAt = new Date().toISOString();

    const verificationToken: VerificationToken = {
      id,
      jobId: input.jobId,
      token,
      createdAt,
      expiresAt: input.expiresAt,
      createdBy: input.createdBy,
      isRevoked: false,
    };

    // Store by token (primary lookup)
    await kv.set(tokenKey(token), verificationToken, { ex: TOKEN_TTL_SECONDS });

    // Store token reference by jobId (for lookup and revocation)
    await kv.set(jobTokenKey(input.jobId), token, { ex: TOKEN_TTL_SECONDS });

    return verificationToken;
  },

  async getTokenByToken(token: string): Promise<VerificationToken | null> {
    const verificationToken = await kv.get<VerificationToken>(tokenKey(token));
    return verificationToken;
  },

  async getTokenByJobId(jobId: string): Promise<VerificationToken | null> {
    // Get the current token for this job
    const token = await kv.get<string>(jobTokenKey(jobId));
    if (!token) return null;

    return this.getTokenByToken(token);
  },

  async revokeTokensByJobId(jobId: string): Promise<void> {
    // Get current token for this job
    const token = await kv.get<string>(jobTokenKey(jobId));
    if (!token) return;

    // Get the token record and mark as revoked
    const verificationToken = await kv.get<VerificationToken>(tokenKey(token));
    if (verificationToken && !verificationToken.isRevoked) {
      const updatedToken: VerificationToken = {
        ...verificationToken,
        isRevoked: true,
      };
      await kv.set(tokenKey(token), updatedToken, { ex: TOKEN_TTL_SECONDS });
    }
  },
};
