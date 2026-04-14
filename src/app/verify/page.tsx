"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  FileText,
  Hash,
  Clock,
  User,
  Link as LinkIcon,
  Download,
  Calendar,
  Shield,
} from "lucide-react";
import { Header } from "@/components/Header";

type VerifyStatus = "IDLE" | "VERIFYING" | "MATCH" | "MISMATCH" | "NOT_FOUND" | "ERROR";
type TokenStatus = "LOADING" | "VALID" | "INVALID" | "EXPIRED" | "NOT_FOUND" | "ERROR";

interface VerifyResult {
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

interface TokenInfo {
  jobId: string;
  metadata: {
    posterId: string;
    postedAt: string | null;
    capturedAt: string | null;
    tweetUrl: string;
  };
  pngUrl: string | null;
  hashValue: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  expiresAt: string;
}

async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");
  const tokenParam = searchParams.get("token");

  const [jobId, setJobId] = useState(jobIdParam || "");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<VerifyStatus>("IDLE");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [, setCalculatedHash] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Token-based verification state
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(tokenParam ? "LOADING" : "NOT_FOUND");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenError, setTokenError] = useState<string>("");

  // Fetch token info when token parameter is present
  useEffect(() => {
    if (tokenParam) {
      fetchTokenInfo(tokenParam);
    }
  }, [tokenParam]);

  const fetchTokenInfo = async (token: string) => {
    setTokenStatus("LOADING");
    try {
      const res = await fetch(`/api/verify/token/${token}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          setTokenStatus(data.code === "REVOKED" ? "INVALID" : "EXPIRED");
          setTokenError(data.error);
        } else if (res.status === 404) {
          setTokenStatus("NOT_FOUND");
          setTokenError("このリンクは存在しません");
        } else {
          setTokenStatus("ERROR");
          setTokenError(data.error || "トークンの検証に失敗しました");
        }
        return;
      }

      setTokenInfo(data);
      setJobId(data.jobId);
      setTokenStatus("VALID");
    } catch (error) {
      console.error("Token fetch error:", error);
      setTokenStatus("ERROR");
      setTokenError("トークンの検証に失敗しました");
    }
  };

  useEffect(() => {
    if (jobIdParam) {
      setJobId(jobIdParam);
    }
  }, [jobIdParam]);

  const handleVerify = useCallback(async (uploadedFile: File, currentJobId: string) => {
    if (!currentJobId.trim()) {
      setErrorMessage("Job IDを入力してください");
      setStatus("ERROR");
      return;
    }

    setStatus("VERIFYING");
    setErrorMessage("");
    setResult(null);

    try {
      // Calculate SHA-256 in browser (file never leaves the client)
      const hash = await calculateSHA256(uploadedFile);
      setCalculatedHash(hash);

      // Send only the hash to the server, not the file
      const res = await fetch(`/api/verify/${currentJobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha256: hash }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          setStatus("NOT_FOUND");
          return;
        }
        throw new Error("検証に失敗しました");
      }

      const data: VerifyResult = await res.json();
      setResult(data);
      setStatus(data.status);
    } catch (error) {
      console.error("Verification error:", error);
      setErrorMessage(error instanceof Error ? error.message : "検証中にエラーが発生しました");
      setStatus("ERROR");
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "image/png") {
      setFile(droppedFile);
      handleVerify(droppedFile, jobId);
    } else {
      setErrorMessage("PNGファイルのみアップロード可能です");
      setStatus("ERROR");
    }
  }, [jobId, handleVerify]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleVerify(selectedFile, jobId);
    }
  }, [jobId, handleVerify]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Token invalid/expired UI
  if (tokenParam && (tokenStatus === "INVALID" || tokenStatus === "EXPIRED" || tokenStatus === "NOT_FOUND" || tokenStatus === "ERROR")) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-amber-800 mb-2">
              {tokenStatus === "EXPIRED" ? "リンクの有効期限が切れています" : "無効なリンクです"}
            </h1>
            <p className="text-amber-700 mb-6">
              {tokenError || "このリンクは無効または期限切れです。証拠の所有者に再発行を依頼してください。"}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-6 py-3 rounded-lg transition-colors"
            >
              トップページに戻る
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Token loading UI
  if (tokenParam && tokenStatus === "LOADING") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">検証リンクを確認中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            証拠の真正性を検証
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            スクリーンショットファイルをアップロードすると、Polygon Amoyの記録と照合して
            改ざんの有無を確認できます。<span className="text-blue-600 font-medium">ファイルは外部送信されません。</span>
          </p>
        </div>

        {/* Token-based Evidence Card */}
        {tokenParam && tokenStatus === "VALID" && tokenInfo && (
          <div className="bg-white border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">共有された証拠</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <User className="w-4 h-4" />
                  投稿者
                </div>
                <p className="text-gray-900 font-medium">{tokenInfo.metadata.posterId || "-"}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Clock className="w-4 h-4" />
                  キャプチャ日時
                </div>
                <p className="text-gray-900">{formatDate(tokenInfo.metadata.capturedAt)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <LinkIcon className="w-4 h-4" />
                  元のURL
                </div>
                <a
                  href={tokenInfo.metadata.tweetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm truncate block"
                >
                  {tokenInfo.metadata.tweetUrl}
                </a>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  リンク有効期限
                </div>
                <p className="text-gray-900">{formatDate(tokenInfo.expiresAt)}</p>
              </div>
            </div>

            {tokenInfo.pngUrl && (
              <a
                href={tokenInfo.pngUrl}
                download
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                検証用PNGをダウンロード
              </a>
            )}

            {tokenInfo.explorerUrl && (
              <a
                href={tokenInfo.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 ml-3 text-blue-600 hover:text-blue-800 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Polygonscanで確認
              </a>
            )}
          </div>
        )}

        {/* Job ID Input (if not provided via URL or token) */}
        {!jobIdParam && !tokenParam && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job ID
            </label>
            <input
              type="text"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="job_xxxxxxxx（PDFに記載されたJob ID）"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        )}

        {/* File Upload Area */}
        <div
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`bg-white border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            type="file"
            accept=".png"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? "text-blue-500" : "text-gray-400"}`} />
            <p className="text-lg font-medium text-gray-700 mb-2">
              スクリーンショットをドラッグ＆ドロップ
            </p>
            <p className="text-sm text-gray-500 mb-4">
              または <span className="text-blue-600">クリックしてファイルを選択</span>
            </p>
            <p className="text-xs text-gray-400">
              PNG形式のみ対応
            </p>
          </label>

          {file && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Verification Result */}
        {status === "VERIFYING" && (
          <div className="mt-8 bg-white border border-gray-200 rounded-xl p-8 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Polygon Amoyと照合中...</p>
            <p className="text-sm text-gray-500 mt-2">ブロックチェーンのトランザクションを確認しています</p>
          </div>
        )}

        {status === "MATCH" && result && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h2 className="text-xl font-bold text-green-800">
                改ざんなし — 証拠の真正性が確認されました
              </h2>
            </div>
            <p className="text-green-700 mb-6">
              アップロードされたファイルのハッシュ値が、{result.source === "blockchain" ? "Polygon Amoyブロックチェーン" : "データベース"}に記録された値と一致しました。
            </p>

            <div className="bg-white rounded-lg p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Hash className="w-4 h-4" />
                  SHA-256 ハッシュ値
                </div>
                <code className="block text-xs font-mono bg-gray-100 p-3 rounded break-all text-gray-800">
                  {result.calculatedHash}
                </code>
              </div>

              {result.txHash && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <ExternalLink className="w-4 h-4" />
                    ブロックチェーン記録
                  </div>
                  <a
                    href={result.polygonScanUrl || `https://amoy.polygonscan.com/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {result.txHash.slice(0, 20)}...{result.txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <User className="w-4 h-4" />
                    投稿者
                  </div>
                  <p className="text-gray-800">{result.metadata.posterId || "-"}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    投稿日時
                  </div>
                  <p className="text-gray-800">{result.metadata.postedAt || "-"}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    キャプチャ日時
                  </div>
                  <p className="text-gray-800">{result.metadata.capturedAt || "-"}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <LinkIcon className="w-4 h-4" />
                    元のURL
                  </div>
                  <a
                    href={result.metadata.tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm truncate block"
                  >
                    {result.metadata.tweetUrl}
                  </a>
                </div>
              </div>

              {result.source === "database" && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    ブロックチェーン記録なし（DB照合）
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {status === "MISMATCH" && result && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-red-800">
                不一致 — ファイルが改ざんされている可能性があります
              </h2>
            </div>
            <p className="text-red-700 mb-6">
              アップロードされたファイルのハッシュ値が、記録された値と一致しませんでした。
            </p>

            <div className="bg-white rounded-lg p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">計算されたハッシュ値（アップロードファイル）</div>
                <code className="block text-xs font-mono bg-red-100 p-3 rounded break-all text-red-800">
                  {result.calculatedHash}
                </code>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">記録されたハッシュ値（{result.source === "blockchain" ? "Polygon Amoy" : "データベース"}）</div>
                <code className="block text-xs font-mono bg-gray-100 p-3 rounded break-all text-gray-800">
                  {result.recordedHash}
                </code>
              </div>
            </div>
          </div>
        )}

        {status === "NOT_FOUND" && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <h2 className="text-xl font-bold text-yellow-800">
                記録が見つかりません
              </h2>
            </div>
            <p className="text-yellow-700">
              指定されたJob IDに対応するブロックチェーン記録またはデータベース記録が見つかりませんでした。
              Job IDが正しいかご確認ください。
            </p>
          </div>
        )}

        {status === "ERROR" && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-red-800">エラー</h2>
            </div>
            <p className="text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* How it works */}
        <div className="mt-12 bg-white border border-gray-200 rounded-xl p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">検証の仕組み</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-700 font-bold">1</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">ハッシュ計算</h4>
              <p className="text-sm text-gray-600">
                アップロードされたファイルのSHA-256をブラウザ内で計算。ファイルは外部に送信されません。
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-700 font-bold">2</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Polygon照合</h4>
              <p className="text-sm text-gray-600">
                WatchDogがキャプチャ時にPolygon Amoyへ記録したトランザクションデータと比較します。
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-700 font-bold">3</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">結果表示</h4>
              <p className="text-sm text-gray-600">
                ハッシュ値が完全一致なら改ざんなし、不一致なら改ざんの可能性ありと判定します。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
