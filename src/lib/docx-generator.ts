import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  HeadingLevel,
  AlignmentType,
  convertMillimetersToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { LegalClaimType, EvidenceDocument } from "@/types";
import { courtDocumentFormat, generateClaimText } from "./templates/legal-templates";

/**
 * 証拠説明書（Word形式）を生成
 * 広島地裁等の書式（左30mm余白等）に準拠
 */
export async function generateEvidenceDocument(
  data: EvidenceDocument
): Promise<Buffer> {
  // 立証趣旨テキストを生成
  const claimText = data.claimText || generateClaimText(data.claimType, {});

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "MS Mincho",
            size: 24, // 12pt
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30), // 左30mm余白
            },
          },
        },
        children: [
          // タイトル
          new Paragraph({
            children: [
              new TextRun({
                text: "証 拠 説 明 書（案）",
                bold: true,
                size: 32, // 16pt
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // 注意書き
          new Paragraph({
            children: [
              new TextRun({
                text: "※本書面はAIが自動生成したサンプルです。最終的な内容は弁護士等の専門家にご確認の上、ご自身の責任でご利用ください。",
                italics: true,
                size: 18, // 9pt
                color: "666666",
              }),
            ],
            spacing: { after: 600 },
          }),

          // 証拠番号
          new Paragraph({
            children: [
              new TextRun({
                text: `証拠番号：${data.evidenceNumber}`,
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),

          // 証拠一覧表
          createEvidenceTable(data),

          // 立証趣旨
          new Paragraph({
            children: [
              new TextRun({
                text: "【立証趣旨】",
                bold: true,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: claimText,
              }),
            ],
            spacing: { after: 400 },
          }),

          // 補足事項
          ...(data.additionalNotes
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "【補足事項】",
                      bold: true,
                    }),
                  ],
                  spacing: { before: 400, after: 200 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: data.additionalNotes,
                    }),
                  ],
                }),
              ]
            : []),

          // 真正性担保に関する記載
          new Paragraph({
            children: [
              new TextRun({
                text: "【証拠の真正性について】",
                bold: true,
              }),
            ],
            spacing: { before: 600, after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `本証拠PDFのSHA-256ハッシュ値：${data.hash}`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "上記ハッシュ値により、本証拠が取得時点から改ざんされていないことを検証可能です。",
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * 証拠一覧表を作成
 */
function createEvidenceTable(data: EvidenceDocument): Table {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: "000000",
  };

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      // ヘッダー行
      new TableRow({
        children: [
          createTableCell("項目", true, 30),
          createTableCell("内容", true, 70),
        ],
      }),
      // 証拠の標目
      new TableRow({
        children: [
          createTableCell("証拠の標目", false, 30),
          createTableCell(`${data.evidenceNumber}（WebページキャプチャPDF）`, false, 70),
        ],
      }),
      // 作成日時
      new TableRow({
        children: [
          createTableCell("作成者", false, 30),
          createTableCell("（相手方）", false, 70),
        ],
      }),
      // 取得日時
      new TableRow({
        children: [
          createTableCell("取得日時", false, 30),
          createTableCell(data.capturedAt, false, 70),
        ],
      }),
      // 取得URL
      new TableRow({
        children: [
          createTableCell("取得URL", false, 30),
          createTableCell(data.url, false, 70),
        ],
      }),
    ],
  });
}

function createTableCell(
  text: string,
  isHeader: boolean,
  widthPercent: number
): TableCell {
  return new TableCell({
    width: {
      size: widthPercent,
      type: WidthType.PERCENTAGE,
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
          }),
        ],
      }),
    ],
  });
}

/**
 * 立証趣旨タイプのラベルを取得
 */
export function getClaimTypeLabel(claimType: LegalClaimType): string {
  const labels: Record<LegalClaimType, string> = {
    defamation: "名誉毀損",
    insult: "侮辱",
    privacy: "プライバシー侵害",
    custom: "その他",
  };
  return labels[claimType];
}
