"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2 } from "lucide-react";

export function HeroForm() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    router.push(`/app?url=${encodeURIComponent(url)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Link2 className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="保全したいXのURLを貼り付け"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            required
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-6 rounded-xl transition-all whitespace-nowrap"
        >
          保全開始
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
