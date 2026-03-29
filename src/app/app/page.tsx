"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Scale, Gavel, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";
import { ResultCard } from "@/components/ResultCard";
import { ProcessState, LegalClaimType } from "@/types";

interface CaptureResult {
  pdfBase64: string;
  docxBase64: string;
  hash: string;
  capturedAt: string;
  postText?: string;
}

function AppContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [state, setState] = useState<ProcessState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [prefilledUrl, setPrefilledUrl] = useState(initialUrl);

  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setPrefilledUrl(urlParam);
    }
  }, [searchParams]);

  const handleCapture = async (data: {
    url: string;
    claimType: LegalClaimType;
    customClaimText?: string;
    evidenceNumber: string;
  }) => {
    setState("capturing");
    setErrorMsg("");
    setResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setState("processing");

      if (!res.ok) {
        let errorMessage = "キャプチャに失敗しました";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSONパースに失敗した場合はデフォルトメッセージを使用
        }
        throw new Error(errorMessage);
      }

      setState("generating");
      const responseData = await res.json();

      setState("done");
      setResult({
        pdfBase64: responseData.pdfBase64,
        docxBase64: responseData.docxBase64,
        hash: responseData.hash,
        capturedAt: responseData.capturedAt,
        postText: responseData.postText,
      });
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "予期せぬエラーが発生しました";

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          errorMessage = "処理がタイムアウトしました。しばらく待ってから再度お試しください。";
        } else if (err.message === "Failed to fetch") {
          errorMessage = "サーバーとの通信に失敗しました。処理中の可能性があります。しばらく待ってから再度お試しください。";
        } else {
          errorMessage = err.message;
        }
      }

      setErrorMsg(errorMessage);
      setState("error");
    }
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
          <CaptureForm onSubmit={handleCapture} state={state} initialUrl={prefilledUrl} />

          {/* Help Link */}
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

          {/* Error Display */}
          {errorMsg && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-inter text-center text-sm">
              {errorMsg}
            </div>
          )}

          {/* Result Display */}
          {state === "done" && result && (
            <ResultCard
              pdfBase64={result.pdfBase64}
              docxBase64={result.docxBase64}
              hash={result.hash}
              capturedAt={result.capturedAt}
            />
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
