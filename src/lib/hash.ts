import * as crypto from "crypto";

/**
 * SHA-256ハッシュを計算
 */
export function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * ハッシュ値を検証
 */
export function verifyHash(buffer: Buffer, expectedHash: string): boolean {
  const actualHash = calculateSHA256(buffer);
  return actualHash === expectedHash;
}
