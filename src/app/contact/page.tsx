"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";

type InquiryType = "advertising" | "pricing" | "other";

interface FormData {
  name: string;
  organization: string;
  email: string;
  phone: string;
  inquiryType: InquiryType;
  message: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    organization: "",
    email: "",
    phone: "",
    inquiryType: "advertising",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.message.trim() !== "";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setErrorMsg("必須項目を入力してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("送信に失敗しました");
      }

      setIsSubmitted(true);
    } catch {
      setErrorMsg(
        "送信に失敗しました。時間をおいて再度お試しいただくか、直接メールにてご連絡ください。"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center p-4 bg-green-500/10 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">お問い合わせありがとうございます</h1>
          <p className="text-gray-400 mb-8">2〜3営業日以内にご連絡いたします。</p>
          <Link
            href="/app"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ツールに戻る
          </Link>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Page Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 text-sm text-blue-400 mb-6">
            <Mail className="w-4 h-4" />
            お問い合わせ
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            広告掲載のご希望・お問い合わせ
          </h1>
          <p className="text-gray-400 text-lg">
            弁護士・法律事務所の広告掲載に関するお問い合わせはこちらからどうぞ。
            <br className="hidden md:block" />
            通常2〜3営業日以内にご返信いたします。
          </p>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              お名前 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="山田 太郎"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Organization */}
          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-300 mb-2">
              事務所名・会社名
            </label>
            <input
              type="text"
              id="organization"
              name="organization"
              value={formData.organization}
              onChange={handleChange}
              placeholder="○○法律事務所"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              メールアドレス <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@example.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              電話番号
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="03-0000-0000"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Inquiry Type */}
          <div>
            <label htmlFor="inquiryType" className="block text-sm font-medium text-gray-300 mb-2">
              お問い合わせ種別 <span className="text-red-400">*</span>
            </label>
            <select
              id="inquiryType"
              name="inquiryType"
              value={formData.inquiryType}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="advertising">広告掲載について</option>
              <option value="pricing">料金・プランについて</option>
              <option value="other">その他</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
              お問い合わせ内容 <span className="text-red-400">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={5}
              placeholder="ご希望の掲載内容・対応地域・ご質問などをご記入ください。"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all"
          >
            {isSubmitting ? (
              "送信中..."
            ) : (
              <>
                送信する
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="text-center pt-8 mt-8 border-t border-gray-800">
          <Link
            href="/app"
            className="inline-flex items-center text-gray-400 hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ツールに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
