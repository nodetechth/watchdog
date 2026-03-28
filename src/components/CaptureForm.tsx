"use client";

import { useState } from "react";
import { Link2, Loader2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { LegalTypeSelector } from "./LegalTypeSelector";
import { LegalClaimType, ProcessState } from "@/types";

interface CaptureFormProps {
  onSubmit: (data: {
    url: string;
    claimType: LegalClaimType;
    customClaimText?: string;
    evidenceNumber: string;
  }) => Promise<void>;
  state: ProcessState;
}

export function CaptureForm({ onSubmit, state }: CaptureFormProps) {
  const [url, setUrl] = useState("");
  const [claimType, setClaimType] = useState<LegalClaimType>("defamation");
  const [customClaimText, setCustomClaimText] = useState("");
  const [evidenceNumber, setEvidenceNumber] = useState("甲第1号証");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isProcessing = state === "capturing" || state === "processing" || state === "generating";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || isProcessing) return;

    await onSubmit({
      url,
      claimType,
      customClaimText: claimType === "custom" ? customClaimText : undefined,
      evidenceNumber,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* URL入力 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Link2 className="h-5 w-5 text-white/30" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/username/status/..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-inter text-lg"
          required
          disabled={isProcessing}
        />
      </div>

      {/* 詳細設定トグル */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-center text-sm text-white/50 hover:text-white/70 transition-colors py-2"
      >
        {showAdvanced ? (
          <>
            <ChevronUp className="w-4 h-4 mr-1" />
            詳細設定を閉じる
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-1" />
            詳細設定を開く（立証趣旨の選択）
          </>
        )}
      </button>

      {/* 詳細設定 */}
      {showAdvanced && (
        <div className="space-y-6 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
          {/* 証拠番号 */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">
              証拠番号
            </label>
            <input
              type="text"
              value={evidenceNumber}
              onChange={(e) => setEvidenceNumber(e.target.value)}
              placeholder="甲第1号証"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-inter"
              disabled={isProcessing}
            />
          </div>

          {/* 立証趣旨タイプ選択 */}
          <LegalTypeSelector
            selected={claimType}
            onSelect={setClaimType}
            customText={customClaimText}
            onCustomTextChange={setCustomClaimText}
          />
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isProcessing || !url}
        className="group relative flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        {!isProcessing ? (
          <>
            証拠を安全に保全する
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </>
        ) : (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
            {state === "capturing" && "証拠をキャプチャ中..."}
            {state === "processing" && "ハッシュ値を計算中..."}
            {state === "generating" && "証拠説明書を生成中..."}
          </>
        )}
      </button>
    </form>
  );
}
