"use client";

import { ShieldCheck, FileText, Scale, Download, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ResultCardProps {
  pdfBase64: string;
  docxBase64: string;
  hash: string;
  capturedAt: string;
}

export function ResultCard({ pdfBase64, docxBase64, hash, capturedAt }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (base64: string, filename: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(pdfBase64, `evidence_${timestamp}.pdf`, "application/pdf");
  };

  const handleDownloadDocx = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(
      docxBase64,
      `evidence_description_${timestamp}.docx`,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  };

  return (
    <div className="mt-8 pt-8 border-t border-white/10 animate-fade-in">
      {/* 完了ヘッダー */}
      <div className="flex items-center justify-center mb-6">
        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-green-400" />
        </div>
        <div className="ml-4">
          <h3 className="text-white font-medium text-lg">保全完了</h3>
          <p className="text-white/50 text-sm font-inter">
            {capturedAt}
          </p>
        </div>
      </div>

      {/* ハッシュ値表示 */}
      <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/50 text-xs font-medium">SHA-256 ハッシュ値</span>
          <button
            onClick={handleCopyHash}
            className="flex items-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                コピー済み
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                コピー
              </>
            )}
          </button>
        </div>
        <p
          className="text-white/70 text-xs font-mono break-all leading-relaxed"
          title={hash}
        >
          {hash}
        </p>
      </div>

      {/* ダウンロードボタン */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleDownloadPdf}
          className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors group text-left"
        >
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-rose-400 mr-3" />
            <div>
              <span className="text-white/90 font-medium block">証拠PDF</span>
              <span className="text-white/40 text-xs">PDF/A形式</span>
            </div>
          </div>
          <Download className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
        </button>

        <button
          onClick={handleDownloadDocx}
          className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors group text-left"
        >
          <div className="flex items-center">
            <Scale className="w-5 h-5 text-indigo-400 mr-3" />
            <div>
              <span className="text-white/90 font-medium block">証拠説明書（案）</span>
              <span className="text-white/40 text-xs">Word形式</span>
            </div>
          </div>
          <Download className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* 注意書き */}
      <p className="mt-4 text-center text-xs text-white/40">
        証拠説明書はAIが生成したサンプルです。最終的な内容は専門家にご確認ください。
      </p>
    </div>
  );
}
