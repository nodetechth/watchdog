"use client";

import { useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Ticket,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/Header";

function PricingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentCancelled = searchParams.get("payment") === "cancelled";

  const handlePurchase = async () => {
    if (!session) {
      router.push("/login?callbackUrl=/pricing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("決済ページの作成に失敗しました");
      }
    } catch {
      setError("エラーが発生しました。もう一度お試しください");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">料金プラン</h1>
          <p className="text-gray-600">
            チケットを購入して、SNS投稿の証拠を保全しましょう
          </p>
        </div>

        {paymentCancelled && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              決済がキャンセルされました。再度お試しください。
            </p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              無料プラン
            </h2>
            <p className="text-gray-500 mb-6">お試し利用に</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">¥0</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-gray-600">
                <Check className="w-5 h-5 text-green-500" />
                証拠保全（プレビューのみ）
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <Check className="w-5 h-5 text-green-500" />
                ブロックチェーン記録
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Clock className="w-5 h-5" />
                保存期間: 7日間
              </li>
            </ul>
            <Link
              href="/app"
              className="block w-full py-3 px-4 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              無料で試す
            </Link>
          </div>

          {/* Paid Plan */}
          <div className="bg-white border-2 border-blue-500 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-sm font-medium px-3 py-1 rounded-full">
              おすすめ
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              チケットプラン
            </h2>
            <p className="text-gray-500 mb-6">本格的な証拠保全に</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">¥980</span>
              <span className="text-gray-500 ml-2">/ 5枚</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-gray-600">
                <Ticket className="w-5 h-5 text-blue-500" />
                5回分の証拠保全
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <Check className="w-5 h-5 text-green-500" />
                PDF・DOCX ダウンロード
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <Check className="w-5 h-5 text-green-500" />
                ブロックチェーン記録
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <Clock className="w-5 h-5 text-blue-500" />
                保存期間: 5年間
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                チケット有効期限: 3ヶ月
              </li>
            </ul>
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  処理中...
                </>
              ) : (
                "チケットを購入"
              )}
            </button>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>決済は Stripe を通じて安全に処理されます</p>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <PricingContent />
    </Suspense>
  );
}
