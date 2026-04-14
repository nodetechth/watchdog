"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Ticket,
  FileCheck,
  ShieldCheck,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { Job } from "@/lib/infra/types";
import { Header } from "@/components/Header";

export default function DashboardPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingTicket, setUsingTicket] = useState<string | null>(null);
  const [generatingShareLink, setGeneratingShareLink] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchJobs();
    }
  }, [session]);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/user/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getStatusBadge = (job: Job) => {
    const now = new Date();
    const expiresAt = job.expiresAt ? new Date(job.expiresAt) : null;
    const isExpired = expiresAt && expiresAt < now;

    if (isExpired || job.status === "expired") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
          <AlertTriangle className="w-3 h-3" />
          期限切れ
        </span>
      );
    }

    if (job.status === "done") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
          <CheckCircle className="w-3 h-3" />
          完了
        </span>
      );
    }

    if (job.status === "processing" || job.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          処理中
        </span>
      );
    }

    if (job.status === "error") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full">
          <AlertTriangle className="w-3 h-3" />
          エラー
        </span>
      );
    }

    return null;
  };

  const getRemainingDays = (expiresAt: string | undefined) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const truncateUrl = (url: string, maxLength = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // チケット情報を取得
  const getUserTickets = () => {
    const user = session?.user as {
      tickets?: number;
      ticketsExpiresAt?: string;
    };
    const tickets = user?.tickets || 0;
    const expiresAt = user?.ticketsExpiresAt;
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    return { tickets: isExpired ? 0 : tickets, expiresAt, isExpired };
  };

  // チケットを使用してジョブをアップグレード
  const useTicketForJob = async (jobId: string) => {
    const { tickets } = getUserTickets();
    if (tickets <= 0) {
      alert("有効なチケットがありません。チケットを購入してください。");
      return;
    }

    setUsingTicket(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/use-ticket`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "チケットの使用に失敗しました");
        return;
      }

      // セッションを更新してチケット数を反映
      await updateSession();
      // ジョブリストを再取得
      await fetchJobs();
    } catch (error) {
      console.error("Failed to use ticket:", error);
      alert("チケットの使用に失敗しました");
    } finally {
      setUsingTicket(null);
    }
  };

  // 共有リンクを発行
  const generateShareLink = async (jobId: string) => {
    setGeneratingShareLink(jobId);
    try {
      const res = await fetch("/api/verify/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "リンクの発行に失敗しました");
        return;
      }

      // Copy URL to clipboard
      await navigator.clipboard.writeText(data.url);
      setCopiedJobId(jobId);

      // Reset copied state after 3 seconds
      setTimeout(() => {
        setCopiedJobId(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to generate share link:", error);
      alert("リンクの発行に失敗しました");
    } finally {
      setGeneratingShareLink(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">保全した証拠一覧</h1>
            <p className="text-gray-500 mt-1">過去に保全した証拠のダウンロードと検証ができます</p>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            新しい証拠を保全
          </Link>
        </div>

        {/* Plan Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-gray-500">保存期間:</span>
                <span className="ml-2 font-medium text-gray-900">
                  新規は7日間
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  （チケット使用で5年間に延長可能）
                </span>
              </div>
              {(() => {
                const user = session.user as {
                  tickets?: number;
                  ticketsExpiresAt?: string;
                };
                const tickets = user.tickets || 0;
                const expiresAt = user.ticketsExpiresAt;
                const isExpired = expiresAt && new Date(expiresAt) < new Date();

                if (tickets > 0 && !isExpired) {
                  const daysLeft = expiresAt
                    ? Math.ceil(
                        (new Date(expiresAt).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0;
                  return (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">
                      <Ticket className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        残り {tickets} 枚
                      </span>
                      <span className="text-xs text-blue-500">
                        （有効期限: {daysLeft}日）
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <Link
              href="/pricing"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {(session.user as { tickets?: number }).tickets
                ? "チケットを追加購入"
                : "チケットを購入"}
            </Link>
          </div>
        </div>

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだ証拠がありません
            </h3>
            <p className="text-gray-500 mb-6">
              SNS投稿のURLを入力して、証拠を保全しましょう
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              証拠を保全する
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    日時
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    URL
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    ステータス
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    保存期限
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => {
                  const remainingDays = getRemainingDays(job.expiresAt);
                  const isExpired = remainingDays !== null && remainingDays <= 0;
                  const canDownload = job.isPaid && job.status === "done" && !isExpired;

                  return (
                    <tr key={job.jobId} className="hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {formatDate(job.capturedAt || job.createdAt)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600"
                        >
                          {truncateUrl(job.url)}
                        </a>
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(job)}</td>
                      <td className="py-4 px-4 text-sm">
                        {isExpired ? (
                          <span className="text-gray-400">期限切れ</span>
                        ) : remainingDays !== null ? (
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <Clock className="w-3 h-3" />
                            残り{remainingDays}日
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canDownload ? (
                            <>
                              <a
                                href={`/api/download/${job.jobId}/pdf`}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <Download className="w-4 h-4" />
                                PDF
                              </a>
                              <a
                                href={`/api/download/${job.jobId}/docx`}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <Download className="w-4 h-4" />
                                DOCX
                              </a>
                              <button
                                onClick={() => generateShareLink(job.jobId)}
                                disabled={generatingShareLink === job.jobId}
                                className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 disabled:text-gray-400"
                              >
                                {generatingShareLink === job.jobId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : copiedJobId === job.jobId ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Share2 className="w-4 h-4" />
                                )}
                                {copiedJobId === job.jobId ? "コピー済" : "共有"}
                              </button>
                            </>
                          ) : job.status === "done" && !job.isPaid ? (
                            <button
                              onClick={() => useTicketForJob(job.jobId)}
                              disabled={usingTicket === job.jobId || getUserTickets().tickets <= 0}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              {usingTicket === job.jobId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Ticket className="w-4 h-4" />
                              )}
                              {getUserTickets().tickets > 0 ? "チケット使用" : "課金が必要"}
                            </button>
                          ) : null}
                          {job.status === "done" && (
                            <Link
                              href={`/verify?jobId=${job.jobId}`}
                              className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                            >
                              <FileCheck className="w-4 h-4" />
                              検証
                            </Link>
                          )}
                          {job.explorerUrl && (
                            <a
                              href={job.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Polygonscan
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
