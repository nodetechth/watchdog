import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/infra";
import { ethers } from "ethers";

interface VerifyRequest {
  sha256: string;
}

interface PolygonPayload {
  service: string;
  jobId: string;
  sha256: string;
  timestamp: string;
}

interface VerifyResponse {
  status: "MATCH" | "MISMATCH" | "NOT_FOUND";
  recordedHash: string;
  calculatedHash: string;
  txHash: string | null;
  polygonScanUrl: string | null;
  metadata: {
    jobId: string;
    posterId: string;
    postedAt: string;
    capturedAt: string;
    tweetUrl: string;
  };
  source: "blockchain" | "database";
}

const POLYGONSCAN_AMOY_URL = "https://amoy.polygonscan.com/tx";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  try {
    const { jobId } = await params;
    const body: VerifyRequest = await request.json();
    const { sha256: calculatedHash } = body;

    if (!calculatedHash) {
      return NextResponse.json(
        { error: "sha256 is required" },
        { status: 400 }
      );
    }

    // Get job from database
    const job = await jobStore.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const metadata = {
      jobId: job.jobId,
      posterId: "", // Will be extracted from URL or stored metadata
      postedAt: "",
      capturedAt: job.capturedAt || "",
      tweetUrl: job.url,
    };

    // Extract posterId from URL
    const urlMatch = job.url.match(/x\.com\/([^/]+)\/status\//);
    if (urlMatch) {
      metadata.posterId = `@${urlMatch[1]}`;
    }

    // Try Polygon verification first if txHash exists
    if (job.txHash && process.env.POLYGON_RPC_URL) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
        const tx = await provider.getTransaction(job.txHash);

        if (tx && tx.data) {
          // Decode the data field (JSON payload stored as hex)
          const payloadString = ethers.toUtf8String(tx.data);
          const payload: PolygonPayload = JSON.parse(payloadString);
          const recordedHash = payload.sha256.trim();

          // Extract timestamp from payload
          if (payload.timestamp) {
            const date = new Date(payload.timestamp);
            metadata.capturedAt = date.toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          }

          const status = recordedHash === calculatedHash ? "MATCH" : "MISMATCH";

          const response: VerifyResponse = {
            status,
            recordedHash,
            calculatedHash,
            txHash: job.txHash,
            polygonScanUrl: `${POLYGONSCAN_AMOY_URL}/${job.txHash}`,
            metadata,
            source: "blockchain",
          };

          return NextResponse.json(response);
        }
      } catch (error) {
        console.error("Polygon verification error:", error);
        // Fall through to database verification
      }
    }

    // Fallback to database verification
    if (job.hashValue) {
      const recordedHash = job.hashValue.trim();
      const status = recordedHash === calculatedHash ? "MATCH" : "MISMATCH";

      // Format capturedAt for display
      if (job.capturedAt) {
        const date = new Date(job.capturedAt);
        metadata.capturedAt = date.toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }

      const response: VerifyResponse = {
        status,
        recordedHash,
        calculatedHash,
        txHash: job.txHash || null,
        polygonScanUrl: job.txHash ? `${POLYGONSCAN_AMOY_URL}/${job.txHash}` : null,
        metadata,
        source: "database",
      };

      return NextResponse.json(response);
    }

    // No hash found anywhere
    return NextResponse.json(
      { error: "No hash record found for this job" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
