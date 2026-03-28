import Link from "next/link";
import { ShieldCheck, AlertTriangle, Clock, FileText, Hash, FileCheck, ArrowRight, CheckCircle } from "lucide-react";
import { HeroForm } from "@/components/HeroForm";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 text-sm text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              法的証拠として保全
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              投稿が消える前に。
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                法的証拠として自動保全。
              </span>
            </h1>

            {/* Sub Copy */}
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              XやSNSの誹謗中傷投稿を、裁判所が重視するPDF/A形式＋SHA-256ハッシュで自動保存。
              <br className="hidden md:block" />
              証拠説明書の下書きもAIが生成します。
            </p>

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-6">
              <Link
                href="/app"
                className="inline-flex items-center bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg py-4 px-8 rounded-xl transition-all group"
              >
                今すぐ証拠を保全する
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* URL Input Form */}
            <div className="pt-8">
              <HeroForm />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              スクリーンショットでは、
              <br className="md:hidden" />
              <span className="text-red-400">裁判で否認されることがあります</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <ProblemCard
              icon={<Clock className="w-6 h-6" />}
              title="投稿はいつ削除されるかわからない"
              description="誹謗中傷の投稿者は、訴訟を意識した瞬間に証拠を消します。削除されてからでは手遅れです。"
            />
            <ProblemCard
              icon={<AlertTriangle className="w-6 h-6" />}
              title="スクショは証明が困難"
              description="撮影日時・URL・投稿者IDの証明ができず、「捏造の可能性」を指摘されるリスクがあります。"
            />
            <ProblemCard
              icon={<FileText className="w-6 h-6" />}
              title="証拠説明書の作成が大変"
              description="裁判所への提出には証拠説明書が必要。書式や立証趣旨の記載には専門知識が求められます。"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="text-blue-400">3ステップ</span>で完了
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="XのURLを貼り付ける"
              description="保全したい投稿のURLをコピーして、入力欄に貼り付けるだけ。"
            />
            <StepCard
              number="2"
              title="自動キャプチャ・PDF生成"
              description="URL・投稿日時・投稿者IDが写り込む形式で、PDF/Aとして自動保存。"
            />
            <StepCard
              number="3"
              title="証拠一式をダウンロード"
              description="SHA-256ハッシュ証明書＋証拠説明書の下書きをまとめてダウンロード。"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Evidence Guardian が提供する
              <br />
              <span className="text-blue-400">3つの技術的担保</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileCheck className="w-8 h-8" />}
              title="PDF/A 高精度キャプチャ"
              description="URL・投稿日時・投稿者IDが確実に写り込む形式で保存。長期保存に適したPDF/A規格を採用。"
            />
            <FeatureCard
              icon={<Hash className="w-8 h-8" />}
              title="SHA-256 ハッシュ証明"
              description="ファイルの改ざんチェックが可能。取得時点からの非改ざん性を技術的に証明できます。"
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8" />}
              title="証拠説明書AIドラフト"
              description="名誉毀損・侮辱・プライバシー侵害のテンプレートから選択。AIが文脈を補完した下書きを生成。"
            />
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">ご利用にあたって</h3>
                <p className="text-gray-400 leading-relaxed">
                  証拠説明書はあくまで「案（サンプル）」として出力されます。最終的な内容の確認・修正はご自身または弁護士にご依頼ください。本サービスは法律相談・弁護士紹介を行うものではありません。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            まず1件、<span className="text-blue-400">無料で保全</span>してみてください
          </h2>
          <p className="text-gray-400 mb-8">
            アカウント登録不要。今すぐ証拠保全を開始できます。
          </p>
          <Link
            href="/app"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg py-4 px-8 rounded-xl transition-all group"
          >
            証拠を保全する（無料）
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
              <span className="font-semibold">Evidence Guardian</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>運営: nodetech.jp</span>
              <a href="#" className="hover:text-white transition-colors">利用規約</a>
              <a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProblemCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
      <div className="p-3 bg-red-500/10 rounded-xl w-fit mb-4">
        <div className="text-red-400">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative">
      <div className="text-7xl font-bold text-blue-500/10 absolute -top-4 -left-2">
        {number}
      </div>
      <div className="relative pt-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
            {number}
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed pl-11">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
      <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-4">
        <div className="text-blue-400">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
