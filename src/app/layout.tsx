import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Watch Dog | 裁判で勝つための法廷用SNSエビデンス保全ツール",
  description: "X（旧Twitter）の投稿を法的な証拠として高精度に保全するSaaS。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-white text-gray-900 selection:bg-blue-500/30`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
