"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "無料で使えますか？",
    answer: "現在は無料でご利用いただけます。",
  },
  {
    question: "保全したデータはどこに保存されますか？",
    answer:
      "生成されたPDFとハッシュ値はお使いのデバイスにダウンロードされます。サーバーには処理のために一時的にデータが送信されますが、個人情報の第三者提供は行いません。",
  },
  {
    question: "このツールで作った書類は裁判で使えますか？",
    answer:
      "証拠としての提出自体は可能ですが、裁判での有効性は事案や裁判所の判断によります。重要な案件では必ず弁護士にご相談ください。",
  },
  {
    question: "証拠説明書の「案（サンプル）」とはどういう意味ですか？",
    answer:
      "AIが自動生成した下書きです。法的な効力を持たせるには、弁護士による確認・修正が必要です。そのまま提出せず、必ずご自身または専門家が内容を確認してください。",
  },
  {
    question: "X（旧Twitter）以外のSNSにも使えますか？",
    answer:
      "現在はX（旧Twitter）のURLに対応しています。Instagram・Googleマップ等への対応は順次追加予定です。",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {faqItems.map((item, index) => (
        <div
          key={index}
          className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => toggleItem(index)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-800/80 transition-colors"
          >
            <span className="font-medium pr-4">Q. {item.question}</span>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-5 pb-5 pt-0">
              <p className="text-gray-400 leading-relaxed">A. {item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
