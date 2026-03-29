"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Scale, Gavel, HelpCircle, ArrowRight, Loader2, CheckCircle, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { ProcessState, LegalClaimType, JobStatus } from "@/types";

interface JobResult {
  pdfUrl: string;
  docxUrl: string | null;
  hashValue: string;
  capturedAt: string;
  evidenceNumber: string;
}

const POLL_INTERVAL = 2000; // 2秒
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5分

function AppContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [state, setState] = useState<ProcessState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [prefilledUrl, setPrefilledUrl] = useState(initialUrl);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setPrefilledUrl(urlParam);
    }
  }, [searchParams]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) {
        throw new Error("ステータスの取得に失敗しました");
      }

      const data = await res.json();
      const status: JobStatus = data.status;

      if (status === "done") {
        stopPolling();
        setState("done");
        setJobResult({
          pdfUrl: data.pdfUrl,
          docxUrl: data.docxUrl,
          hashValue: data.hashValue,
          capturedAt: data.capturedAt,
          evidenceNumber: data.evidenceNumber,
        });
      } else if (status === "error") {
        stopPolling();
        setState("error");
        setErrorMsg(data.errorMessage || "保全処理中にエラーが発生しました。再度お試しください。");
      } else if (status === "processing") {
        setState("processing");
      }

      // Check for timeout
      if (startTimeRef.current && Date.now() - startTimeRef.current > TIMEOUT_DURATION) {
        stopPolling();
        setState("error");
        setErrorMsg("処理に時間がかかっています。しばらく経ってからページを再読み込みしてください。");
      }
    } catch (err) {
      console.error("Polling error:", err);
      // Don't stop polling on transient errors, but log them
    }
  }, [stopPolling]);

  const startPolling = useCallback((id: string) => {
    startTimeRef.current = Date.now();
    pollIntervalRef.current = setInterval(() => {
      pollJobStatus(id);
    }, POLL_INTERVAL);
    // Also poll immediately
    pollJobStatus(id);
  }, [pollJobStatus]);

  const handleCapture = async (data: {
    url: string;
    claimType: LegalClaimType;
    customClaimText?: string;
    evidenceNumber: string;
  }) => {
    setState("capturing");
    setErrorMsg("");
    setJobResult(null);
    setJobId(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: data.url,
          evidenceNumber: data.evidenceNumber,
          evidenceType: data.claimType,
          customClaimText: data.customClaimText,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "ジョブの作成に失敗しました");
      }

      const { jobId: newJobId } = await res.json();
      setJobId(newJobId);
      setState("processing");

      // Start polling
      startPolling(newJobId);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "予期せぬエラーが発生しました";
      setErrorMsg(errorMessage);
      setState("error");
    }
  };

  const handleReset = () => {
    stopPolling();
    setState("idle");
    setJobId(null);
    setJobResult(null);
    setErrorMsg("");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-outfit">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-600/20 blur-[120px] rounded-full pointer-events-none" />

      <main className="z-10 flex flex-col items-center w-full max-w-4xl px-4 sm:px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl border border-white/10 mb-4 backdrop-blur-md shadow-xl">
            <ShieldCheck className="w-10 h-10 text-indigo-400" />
            <h1 className="ml-3 text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              WatchDog
            </h1>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            法廷基準の{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400">
              SNSエビデンス保全
            </span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto font-inter">
            裁判所が重視する「URL・投稿日時・投稿者ID」を完全にキャプチャし、
            <br className="hidden md:block" />
            証拠説明書のサンプルを自動生成します。
          </p>
        </div>

        {/* Action Card */}
        <div className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          {/* Idle State - Show Form */}
          {state === "idle" && (
            <>
              <CaptureForm onSubmit={handleCapture} state={state} initialUrl={prefilledUrl} />
              <div className="mt-4 text-center">
                <Link
                  href="/help"
                  target="_blank"
                  className="inline-flex items-center text-sm text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 mr-1" />
                  用語の意味・使い方がわからない方はこちら
                </Link>
              </div>
            </>
          )}

          {/* Loading State */}
          {(state === "capturing" || state === "processing" || state === "generating") && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-6">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                証拠を保全しています...
              </h3>
              <p className="text-white/50 mb-2">しばらくお待ちください</p>
              <p className="text-white/30 text-sm">通常30秒〜1分程度かかります</p>
              {jobId && (
                <p className="text-white/20 text-xs mt-4 font-mono">Job ID: {jobId}</p>
              )}
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="py-8 text-center">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 mb-6">
                {errorMsg}
              </div>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                もう一度試す
              </button>
            </div>
          )}

          {/* Success State */}
          {state === "done" && jobResult && (
            <div className="py-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-4 bg-green-500/10 rounded-full mb-4">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  証拠の保全が完了しました
                </h3>
              </div>

              {/* Result Details */}
              <div className="space-y-4 mb-8">
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-white/50 text-sm mb-1">証拠番号</p>
                  <p className="text-white font-medium">{jobResult.evidenceNumber}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-white/50 text-sm mb-1">取得日時</p>
                  <p className="text-white font-medium">{jobResult.capturedAt}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-white/50 text-sm mb-1">SHA-256 ハッシュ値</p>
                  <p className="text-white font-mono text-xs break-all">{jobResult.hashValue}</p>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <a
                  href={jobResult.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
                >
                  <Download className="w-5 h-5" />
                  PDFをダウンロード
                </a>
                {jobResult.docxUrl && (
                  <a
                    href={jobResult.docxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    証拠説明書をダウンロード
                  </a>
                )}
              </div>

              {/* Reset Button */}
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  別の投稿を保全する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 w-full max-w-2xl">
          <FeatureCard
            icon={<ShieldCheck className="w-5 h-5" />}
            title="真正性担保"
            description="SHA-256ハッシュで改ざん検知"
          />
          <FeatureCard
            icon={<Scale className="w-5 h-5" />}
            title="裁判所書式"
            description="広島地裁等の書式に準拠"
          />
          <FeatureCard
            icon={<Gavel className="w-5 h-5" />}
            title="立証趣旨生成"
            description="名誉毀損等のテンプレート"
          />
        </div>

        {/* Lawyer Ad Section */}
        <div className="mt-12 w-full max-w-2xl">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">誹謗中傷に注力している弁護士</h3>
            <p className="text-xs text-gray-400">
              掲載している事務所は広告枠としてご契約いただいています。
              <br />
              法律相談・弁護士紹介を当サービスが行うものではありません。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdSlotCard />
            <AdSlotCard />
            <AdSlotCard />
            <AdSlotCard />
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            ※ 掲載内容は各事務所の責任において提供されます。
            当サービスは法律相談・弁護士紹介を行うものではありません。
          </p>
        </div>

        {/* Legal Notice */}
        <div className="mt-12 text-center">
          <p className="text-xs text-white/30">
            本サービスはエビデンス保全の支援ツールです。証拠説明書はAIが生成したサンプルであり、
            <br className="hidden md:block" />
            最終的な内容の確定はご自身の責任で行ってください。
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <AppContent />
    </Suspense>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
      <div className="flex items-center mb-2">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 mr-3">
          {icon}
        </div>
        <span className="text-white/80 font-medium text-sm">{title}</span>
      </div>
      <p className="text-white/40 text-xs">{description}</p>
    </div>
  );
}

function AdSlotCard() {
  return (
    <div className="min-h-40 bg-gray-800 border border-dashed border-gray-600 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
      <p className="text-gray-400 text-lg font-medium mb-2">広告枠 募集中</p>
      <p className="text-gray-500 text-sm mb-4">
        事務所名・対応地域・注力分野などを掲載できます
      </p>
      <Link
        href="/contact"
        className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm transition-colors"
      >
        掲載のご希望はこちら
        <ArrowRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
}
