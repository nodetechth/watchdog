"use client";

import { LegalClaimType } from "@/types";
import { legalClaimTemplates } from "@/lib/templates/legal-templates";
import { Scale, AlertTriangle, Eye, Edit3 } from "lucide-react";

interface LegalTypeSelectorProps {
  selected: LegalClaimType;
  onSelect: (type: LegalClaimType) => void;
  customText: string;
  onCustomTextChange: (text: string) => void;
}

const icons: Record<LegalClaimType, React.ReactNode> = {
  defamation: <Scale className="w-5 h-5" />,
  insult: <AlertTriangle className="w-5 h-5" />,
  privacy: <Eye className="w-5 h-5" />,
  custom: <Edit3 className="w-5 h-5" />,
};

export function LegalTypeSelector({
  selected,
  onSelect,
  customText,
  onCustomTextChange,
}: LegalTypeSelectorProps) {
  const types: LegalClaimType[] = ["defamation", "insult", "privacy", "custom"];

  return (
    <div className="space-y-4">
      <label className="block text-white/70 text-sm font-medium mb-2">
        立証趣旨のタイプを選択（案）
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {types.map((type) => {
          const template = legalClaimTemplates[type];
          const isSelected = selected === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={`
                flex items-start p-4 rounded-xl border text-left transition-all
                ${
                  isSelected
                    ? "bg-indigo-500/20 border-indigo-500/50 ring-1 ring-indigo-500/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }
              `}
            >
              <div
                className={`
                  flex-shrink-0 p-2 rounded-lg mr-3
                  ${isSelected ? "bg-indigo-500/30 text-indigo-400" : "bg-white/10 text-white/50"}
                `}
              >
                {icons[type]}
              </div>
              <div>
                <span
                  className={`font-medium ${isSelected ? "text-white" : "text-white/80"}`}
                >
                  {template.label}
                </span>
                <p className="text-xs text-white/50 mt-1">{template.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {selected === "custom" && (
        <div className="mt-4">
          <label className="block text-white/70 text-sm font-medium mb-2">
            立証趣旨（自由記述）
          </label>
          <textarea
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder="被告が本件SNS上において..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-inter text-sm min-h-[120px] resize-y"
          />
        </div>
      )}

      <p className="text-xs text-white/40 mt-2">
        ※ 立証趣旨はAIが文脈を補完したサンプルです。最終確定はご自身で行ってください。
      </p>
    </div>
  );
}
