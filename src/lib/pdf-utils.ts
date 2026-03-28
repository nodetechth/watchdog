/**
 * PDF操作ユーティリティ
 * 将来のRFC3161タイムスタンプAPI対応準備
 */

export interface TimestampInfo {
  timestamp: string;        // ISO 8601形式
  authority: string;        // タイムスタンプ局
  token: string;            // タイムスタンプトークン（Base64）
  hash: string;             // 対象ファイルのハッシュ
}

/**
 * RFC3161タイムスタンプを取得（将来実装用スタブ）
 * セイコーソリューションズ等のTSA（Time Stamp Authority）と連携
 */
export async function requestRFC3161Timestamp(
  pdfBuffer: Buffer,
  hash: string
): Promise<TimestampInfo | null> {
  // TODO: 実際のRFC3161 TSAサーバーへのリクエスト実装
  //
  // セイコーソリューションズ「かんたん電子契約」API対応例:
  // const TSA_URL = process.env.SEIKO_TSA_URL;
  // const API_KEY = process.env.SEIKO_API_KEY;
  //
  // const tsRequest = createTimestampRequest(hash);
  // const response = await fetch(TSA_URL, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/timestamp-query",
  //     "Authorization": `Bearer ${API_KEY}`,
  //   },
  //   body: tsRequest,
  // });
  //
  // const tsResponse = await response.arrayBuffer();
  // return parseTimestampResponse(tsResponse);

  console.log("[PDF-Utils] RFC3161タイムスタンプ: 将来実装予定");
  return null;
}

/**
 * PDFにタイムスタンプ情報をメタデータとして埋め込む（将来実装用スタブ）
 */
export async function embedTimestampInPdf(
  pdfBuffer: Buffer,
  timestampInfo: TimestampInfo
): Promise<Buffer> {
  // TODO: pdf-libなどを使用してPDFメタデータを編集
  //
  // import { PDFDocument } from "pdf-lib";
  //
  // const pdfDoc = await PDFDocument.load(pdfBuffer);
  // pdfDoc.setCreationDate(new Date(timestampInfo.timestamp));
  // pdfDoc.setModificationDate(new Date(timestampInfo.timestamp));
  // pdfDoc.setKeywords([
  //   `TSA:${timestampInfo.authority}`,
  //   `Token:${timestampInfo.token}`,
  //   `Hash:${timestampInfo.hash}`,
  // ]);
  //
  // return Buffer.from(await pdfDoc.save());

  console.log("[PDF-Utils] PDFメタデータ埋め込み: 将来実装予定");
  return pdfBuffer;
}

/**
 * PDFプロパティを編集する準備関数
 * 将来、タイムスタンプやカスタムメタデータを追加する際に使用
 */
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  // カスタムプロパティ（RFC3161対応用）
  customProperties?: Record<string, string>;
}

export async function setPdfMetadata(
  pdfBuffer: Buffer,
  metadata: PdfMetadata
): Promise<Buffer> {
  // TODO: pdf-libで実装
  //
  // import { PDFDocument } from "pdf-lib";
  //
  // const pdfDoc = await PDFDocument.load(pdfBuffer);
  // if (metadata.title) pdfDoc.setTitle(metadata.title);
  // if (metadata.author) pdfDoc.setAuthor(metadata.author);
  // if (metadata.subject) pdfDoc.setSubject(metadata.subject);
  // if (metadata.keywords) pdfDoc.setKeywords(metadata.keywords);
  // if (metadata.creator) pdfDoc.setCreator(metadata.creator);
  // if (metadata.producer) pdfDoc.setProducer(metadata.producer);
  // if (metadata.creationDate) pdfDoc.setCreationDate(metadata.creationDate);
  // if (metadata.modificationDate) pdfDoc.setModificationDate(metadata.modificationDate);
  //
  // return Buffer.from(await pdfDoc.save());

  console.log("[PDF-Utils] PDFメタデータ設定: 将来実装予定");
  return pdfBuffer;
}
