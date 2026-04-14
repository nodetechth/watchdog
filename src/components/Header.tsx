"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LogOut, User } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navLinkClass = (path: string) =>
    `text-sm transition-colors ${
      isActive(path)
        ? "text-blue-600 font-medium"
        : "text-gray-600 hover:text-gray-900"
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <span className="font-semibold text-gray-900">WatchDog</span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/app" className={navLinkClass("/app")}>
            証拠保全
          </Link>
          <Link href="/verify" className={navLinkClass("/verify")}>
            証拠検証
          </Link>
          <Link href="/help" className={navLinkClass("/help")}>
            ヘルプ
          </Link>
          <Link href="/contact" className={navLinkClass("/contact")}>
            お問い合わせ
          </Link>

          {/* Auth section */}
          {status === "loading" ? (
            <div className="w-20 h-4 bg-gray-200 animate-pulse rounded" />
          ) : session ? (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
              <Link
                href="/dashboard"
                className={navLinkClass("/dashboard")}
              >
                <span className="inline-flex items-center gap-1">
                  <User className="w-4 h-4" />
                  マイページ
                </span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ログイン
              </Link>
              <Link
                href="/login"
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                会員登録
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
