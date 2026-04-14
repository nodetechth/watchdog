"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Scale, Gavel, HelpCircle, ArrowRight, Loader2, CheckCircle, Download, RefreshCw, Link as LinkIcon, Clock, AlertTriangle, Ticket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { Header } from "@/components/Header";
import { ProcessState, LegalClaimType, JobStatus } from "@/types";
import { UserPlan } from "@/lib/infra/types";

interface JobResult {
  pdfUrl: string | null;
  docxUrl: string | null;
  hashValue: string;
  capturedAt: string;
  evidenceNumber: string;
  txHash?: string;
  explorerUrl?: string;
  userPlan: UserPlan;
  expiresAt: string;
  isPaid: boolean;
}

const POLL_INTERVAL = 2000; // 2秒
const TIMEOUT_DURATION = 5 * 60 * 1000; // 5分

function AppContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  const { data: session } = useSession();

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
          txHash: data.txHash,
          explorerUrl: data.explorerUrl,
          userPlan: data.userPlan || "guest",
          expiresAt: data.expiresAt,
          isPaid: data.isPaid || false,
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

  const getExpirationText = (userPlan: UserPlan) => {
    switch (userPlan) {
      case "guest":
        return "24時間後";
      case "free":
        return "7日後";
      case "paid":
        return "5年間保存";
      default:
        return "24時間後";
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-white font-outfit">
      <Header />

      <main className="flex-1 flex flex-col items-center w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
            <ShieldCheck className="w-10 h-10 text-blue-600" />
            <h1 className="ml-3 text-3xl font-bold tracking-tight text-blue-700">
              WatchDog
            </h1>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            法廷基準の{" "}
            <span className="text-blue-700">
              SNSエビデンス保全
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-inter">
            裁判所が重視する「URL・投稿日時・投稿者ID」を完全にキャプチャし、
            <br className="hidden md:block" />
            証拠説明書のサンプルを自動生成します。
          </p>
        </div>

        {/* Action Card */}
        <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm">
          {/* Idle State - Show Form */}
          {state === "idle" && (
            <>
              {/* Ticket Status for logged in users */}
              {session && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  {(() => {
                    const user = session.user as {
                      tickets?: number;
                      ticketsExpiresAt?: string;
                    };
                    const tickets = user.tickets || 0;
                    const expiresAt = user.ticketsExpiresAt;
                    const isExpired = expiresAt && new Date(expiresAt) < new Date();
                    const hasValidTickets = tickets > 0 && !isExpired;

                    if (hasValidTickets) {
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">
                              残りチケット: {tickets}枚
                            </span>
                            <span className="text-xs text-gray-500">
                              （5年間保存で証拠保全）
                            </span>
                          </div>
                          <Link
                            href="/pricing"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            追加購入
                          </Link>
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="text-sm text-gray-700">
                            チケットがありません（7日間保存になります）
                          </span>
                        </div>
                        <Link
                          href="/pricing"
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          チケットを購入
                        </Link>
                      </div>
                    );
                  })()}
                </div>
              )}

              <CaptureForm onSubmit={handleCapture} state={state} initialUrl={prefilledUrl} />
              <div className="mt-4 text-center">
                <Link
                  href="/help"
                  target="_blank"
                  className="inline-flex items-center text-sm text-gray-400 hover:text-blue-600 transition-colors"
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
              <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-full mb-6">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                証拠を保全しています...
              </h3>
              <p className="text-gray-500 mb-2">しばらくお待ちください</p>
              <p className="text-gray-400 text-sm">通常30秒〜1分程度かかります</p>
              {jobId && (
                <p className="text-gray-300 text-xs mt-4 font-mono">Job ID: {jobId}</p>
              )}
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="py-8 text-center">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6">
                {errorMsg}
              </div>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                もう一度試す
              </button>
            </div>
          )}

          {/* Success State */}
          {state === "done" && jobResult && (
            <div className="py-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center p-4 bg-green-50 rounded-full mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  証拠の保全が完了しました
                </h3>
              </div>

              {/* Expiration Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    このデータは{getExpirationText(jobResult.userPlan)}に削除されます
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    保存期限: {new Date(jobResult.expiresAt).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>

              {/* Result Details */}
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">証拠番号</p>
                  <p className="text-gray-900 font-medium">{jobResult.evidenceNumber}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">取得日時</p>
                  <p className="text-gray-900 font-medium">{jobResult.capturedAt}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">SHA-256 ハッシュ値</p>
                  <p className="text-gray-900 font-mono text-xs break-all">{jobResult.hashValue}</p>
                </div>
              </div>

              {/* Action Buttons based on isPaid */}
              {jobResult.isPaid ? (
                <>
                  {/* Download Buttons for paid users */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    {jobResult.pdfUrl && (
                      <a
                        href={jobResult.pdfUrl}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        PDFをダウンロード
                      </a>
                    )}
                    {jobResult.docxUrl && (
                      <a
                        href={jobResult.docxUrl}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        証拠説明書をダウンロード
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Registration/Payment prompts for non-paid users */}
                  <div className="space-y-3 mb-6">
                    {!session ? (
                      <>
                        <Link
                          href="/login"
                          className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
                        >
                          無料登録して7日間保存する
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                        <button
                          disabled
                          className="w-full inline-flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-400 font-semibold py-4 px-6 rounded-xl cursor-not-allowed"
                        >
                          <Download className="w-5 h-5" />
                          今すぐダウンロードする（課金）
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/pricing"
                          className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
                        >
                          <Ticket className="w-5 h-5" />
                          チケットを購入してダウンロード
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <AlertTriangle className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      ダウンロードするには登録と課金が必要です
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      課金後、マイページからいつでもダウンロードできます
                    </p>
                  </div>
                </>
              )}

              {/* Reset Button */}
              <div className="text-center mt-6">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  別の投稿を保全する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Polygon Blockchain Banner */}
        <div className="w-full max-w-2xl mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LinkIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Polygonブロックチェーンにハッシュを記録</p>
                <p className="text-xs text-gray-500">改ざんの有無を第三者が独立して検証できます</p>
              </div>
            </div>
            <a
              href={jobResult?.explorerUrl || "https://polygonscan.com/"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              Polygonscanで確認 →
            </a>
          </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">誹謗中傷に注力している弁護士</h3>
            <p className="text-xs text-gray-500">
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
          <p className="text-xs text-gray-400">
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
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
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
    <div className="p-4 bg-white border border-gray-200 rounded-2xl">
      <div className="flex items-center mb-2">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mr-3">
          {icon}
        </div>
        <span className="text-gray-900 font-medium text-sm">{title}</span>
      </div>
      <p className="text-gray-500 text-xs">{description}</p>
    </div>
  );
}

function AdSlotCard() {
  return (
    <div className="min-h-40 bg-white border border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
      <p className="text-gray-500 text-lg font-medium mb-2">広告枠 募集中</p>
      <p className="text-gray-400 text-sm mb-4">
        事務所名・対応地域・注力分野などを掲載できます
      </p>
      <Link
        href="/contact"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm transition-colors"
      >
        掲載のご希望はこちら
        <ArrowRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
}
