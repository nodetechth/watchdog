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
      <label className="block text-gray-700 text-sm font-medium mb-2">
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
                    ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }
              `}
            >
              <div
                className={`
                  flex-shrink-0 p-2 rounded-lg mr-3
                  ${isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}
                `}
              >
                {icons[type]}
              </div>
              <div>
                <span
                  className={`font-medium ${isSelected ? "text-gray-900" : "text-gray-700"}`}
                >
                  {template.label}
                </span>
                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {selected === "custom" && (
        <div className="mt-4">
          <label className="block text-gray-700 text-sm font-medium mb-2">
            立証趣旨（自由記述）
          </label>
          <textarea
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder="被告が本件SNS上において..."
            className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-inter text-sm min-h-[120px] resize-y"
          />
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        ※ 立証趣旨はAIが文脈を補完したサンプルです。最終確定はご自身で行ってください。
      </p>
    </div>
  );
}
