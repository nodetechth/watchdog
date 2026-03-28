import { LegalClaimType } from "@/types";

// 立証趣旨テンプレート
export const legalClaimTemplates: Record<LegalClaimType, {
  label: string;
  description: string;
  template: string;
}> = {
  defamation: {
    label: "名誉毀損",
    description: "社会的評価を低下させる事実の摘示があった場合",
    template: `被告が、{postedAt}頃、SNS「X（旧Twitter）」上において、原告に関し「{postSummary}」等と投稿し、不特定多数の者が閲覧可能な状態に置いたことにより、原告の社会的評価を低下させる事実を摘示し、もって原告の名誉を毀損した事実を立証する。`,
  },
  insult: {
    label: "侮辱",
    description: "事実の摘示なく、公然と人を侮辱した場合",
    template: `被告が、{postedAt}頃、SNS「X（旧Twitter）」上において、原告に対し「{postSummary}」等と侮蔑的表現を用いて投稿し、公然と原告を侮辱した事実を立証する。`,
  },
  privacy: {
    label: "プライバシー侵害",
    description: "私生活上の事実を公開された場合",
    template: `被告が、{postedAt}頃、SNS「X（旧Twitter）」上において、原告の私生活上の事実である「{postSummary}」を、原告の同意なく不特定多数の者に公開し、原告のプライバシーを侵害した事実を立証する。`,
  },
  custom: {
    label: "その他（カスタム）",
    description: "上記に該当しない場合、自由に記述",
    template: `本件SNS投稿の存在及びその内容を立証する。`,
  },
};

// 立証趣旨テキストを生成
export function generateClaimText(
  claimType: LegalClaimType,
  params: {
    postedAt?: string;
    postSummary?: string;
    customText?: string;
  }
): string {
  if (claimType === "custom" && params.customText) {
    return params.customText;
  }

  const template = legalClaimTemplates[claimType].template;

  return template
    .replace("{postedAt}", params.postedAt || "[投稿日時]")
    .replace("{postSummary}", params.postSummary || "[投稿内容の要約]");
}

// 広島地裁等の書式設定
export const courtDocumentFormat = {
  // 余白設定（単位: twip, 1inch = 1440twip, 1mm ≒ 56.7twip）
  margins: {
    top: 1701,      // 30mm
    right: 1134,    // 20mm
    bottom: 1134,   // 20mm
    left: 1701,     // 30mm（左30mm余白）
  },
  // フォント設定
  font: {
    name: "MS Mincho",  // 明朝体
    size: 24,           // 12pt（half-points単位なので24）
  },
  // 行間設定
  lineSpacing: {
    line: 360,          // 1.5倍行間
  },
};
