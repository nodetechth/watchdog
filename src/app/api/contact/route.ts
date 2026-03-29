import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * Contact Form API Route
 *
 * Required environment variables (set in .env.local and Vercel dashboard):
 * - SMTP_HOST: SMTP server hostname (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP server port (e.g., 587)
 * - SMTP_USER: SMTP username/email
 * - SMTP_PASS: SMTP password or app password
 */

interface ContactFormData {
  name: string;
  organization?: string;
  email: string;
  phone?: string;
  inquiryType: "advertising" | "pricing" | "other";
  message: string;
}

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  advertising: "広告掲載について",
  pricing: "料金・プランについて",
  other: "その他",
};

export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.message) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: "メールアドレスの形式が正しくありません" },
        { status: 400 }
      );
    }

    // Check SMTP configuration
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error("SMTP configuration is missing");
      return NextResponse.json(
        { error: "メール設定が構成されていません" },
        { status: 500 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // Format timestamp
    const now = new Date();
    const timestamp = now.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Build email body
    const emailBody = `
【WatchDog】広告掲載のお問い合わせ

以下のお問い合わせがありました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ お名前
${data.name}

■ 事務所名・会社名
${data.organization || "（未入力）"}

■ メールアドレス
${data.email}

■ 電話番号
${data.phone || "（未入力）"}

■ お問い合わせ種別
${INQUIRY_TYPE_LABELS[data.inquiryType] || data.inquiryType}

■ お問い合わせ内容
${data.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

送信日時: ${timestamp}
`.trim();

    // Send email
    await transporter.sendMail({
      from: SMTP_USER,
      to: "takehiro@nodetech.jp",
      replyTo: data.email,
      subject: "【WatchDog】広告掲載のお問い合わせ",
      text: emailBody,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "送信中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
