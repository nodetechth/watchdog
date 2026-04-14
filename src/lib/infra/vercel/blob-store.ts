import { put, del, getDownloadUrl as getBlobDownloadUrl } from "@vercel/blob";
import { BlobStore } from "../types";

/**
 * Vercel Blob Store (Private Store)
 *
 * Private ストアでは署名付きURLが必要です。
 * getDownloadUrl() で有効期限付きの署名付きURLを生成します。
 */
export const vercelBlobStore: BlobStore = {
  async save(key: string, data: Buffer, contentType: string): Promise<string> {
    const blob = await put(key, data, {
      access: "private",
      contentType,
      addRandomSuffix: false,
    });

    console.log(`[BlobStore] Saved: ${blob.url}`);
    return blob.url;
  },

  async getDownloadUrl(key: string): Promise<string> {
    if (!key.startsWith("http")) {
      throw new Error(
        "Vercel Blob requires the full URL. Store the URL returned from save() instead of just the key."
      );
    }

    try {
      // Private blob用の署名付きダウンロードURLを生成
      const downloadUrl = await getBlobDownloadUrl(key);
      console.log(`[BlobStore] Download URL generated for: ${key}`);
      return downloadUrl;
    } catch (error) {
      console.error(`[BlobStore] getDownloadUrl failed for ${key}:`, error);
      throw error;
    }
  },

  async delete(key: string): Promise<void> {
    if (!key.startsWith("http")) {
      console.warn(`[BlobStore] Invalid key for delete: ${key}`);
      return;
    }

    try {
      await del(key);
      console.log(`[BlobStore] Deleted: ${key}`);
    } catch (error) {
      console.error(`[BlobStore] Delete failed for ${key}:`, error);
      // Don't throw - best effort deletion
    }
  },
};
