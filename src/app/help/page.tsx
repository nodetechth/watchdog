import Link from "next/link";
import { ArrowLeft, ExternalLink, HelpCircle, BookOpen, MessageCircleQuestion, Phone } from "lucide-react";
import { FaqAccordion } from "@/components/FaqAccordion";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Page Title */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 text-sm text-blue-400 mb-6">
            <HelpCircle className="w-4 h-4" />
            ヘルプ
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            このツールの使い方・用語解説
          </h1>
          <p className="text-gray-400 text-lg">
            法律用語や操作手順をわかりやすく説明します
          </p>
        </div>

        {/* Section: 基本的な使い方 */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold">使い方は3ステップです</h2>
          </div>

          <div className="space-y-6">
            <StepCard
              number="1"
              title="XのURLをコピーして貼り付ける"
              description="保全したいポストのURLを、ブラウザのアドレスバーからコピーして入力欄に貼り付けてください。"
              example="https://x.com/username/status/123456789"
            />
            <StepCard
              number="2"
              title="証拠番号と立証趣旨のタイプを選ぶ"
              description="証拠番号は書類を区別するための番号です。初めての場合は「甲第1号証」のままでOKです。投稿の内容に近いタイプを4つの中から選んでください。"
            />
            <StepCard
              number="3"
              title="「証拠を安全に保全する」ボタンを押す"
              description="ボタンを押すと自動的にキャプチャが実行され、PDFと証拠説明書の下書きが生成されます。"
            />
          </div>
        </section>

        {/* Section: 用語解説 */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold">用語の意味がわからない方へ</h2>
          </div>

          <div className="grid gap-4">
            <TermCard
              term="証拠番号（甲第1号証）"
              shortDesc="書類につける「整理番号」のようなものです"
              description="裁判では提出する書類に番号をつけて管理します。原告（訴える側）が出す証拠は「甲（こう）」、被告側は「乙（おつ）」と呼ばれます。最初の証拠なら「甲第1号証」、次は「甲第2号証」と増やしていきます。弁護士に相談する際もこの番号で書類を特定するので、最初からつけておくと便利です。"
            />
            <TermCard
              term="立証趣旨（りっしょうしゅし）"
              shortDesc="「この証拠で何を証明したいか」を一文で説明したものです"
              description="裁判所に証拠を提出するとき、「この書類は○○を証明するために出します」という説明文が必要です。それが立証趣旨です。このツールではAIが下書きを自動生成しますが、あくまで「案（サンプル）」です。最終的な内容は弁護士に確認してもらうか、ご自身で修正してください。"
            />
            <TermCard
              term="名誉毀損（めいよきそん）"
              shortDesc="事実を示して人の評判を傷つける行為"
              description="「○○さんは犯罪者だ」「○○社の製品は欠陥品だ」のように、具体的な事実を示すことで相手の社会的評価を下げる行為です。内容が事実であっても、名誉毀損にあたる場合があります。"
            />
            <TermCard
              term="侮辱（ぶじょく）"
              shortDesc="事実を示さずに人をおとしめる行為"
              description="「バカ」「クズ」のように、具体的な事実を示さず、ただ相手を見下したり傷つけたりする言葉を公の場（SNS等）で使う行為です。2022年の法改正で厳罰化されました。"
            />
            <TermCard
              term="プライバシー侵害"
              shortDesc="本人が公開していない個人情報を勝手に広める行為"
              description="住所・電話番号・職場・家族関係など、本人が公開していない情報をSNSで晒す行為です。「特定」と呼ばれる行為もこれにあたります。"
            />
            <TermCard
              term="PDF/A（ピーディーエフ エー）"
              shortDesc="「改ざんされていない」ことが証明しやすいPDFの形式"
              description="通常のPDFより保存性が高く、裁判所への提出書類として適した形式です。このツールでは自動的にPDF/A形式で保存します。"
            />
            <TermCard
              term="SHA-256ハッシュ"
              shortDesc="ファイルの「指紋」のようなもの"
              description="ファイルの内容から計算される固有の文字列です。ファイルが1文字でも変更されると全く違う値になるため、「保存した時点から改ざんされていない」ことの証明に使えます。このツールでは保存と同時に自動で計算・記録します。"
            />
            <TermCard
              term="その他（カスタム）"
              shortDesc="上の3つに当てはまらない場合に使います"
              description="業務妨害・脅迫・ストーキングなど、名誉毀損・侮辱・プライバシー侵害以外のケースや、自分で立証趣旨の文章を書きたい場合に選んでください。"
            />
          </div>
        </section>

        {/* Section: FAQ */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageCircleQuestion className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold">よくある質問</h2>
          </div>

          <FaqAccordion />
        </section>

        {/* Section: 相談窓口 */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold">困ったときの相談先</h2>
          </div>

          <div className="grid gap-4">
            <ContactCard
              name="法テラス（日本司法支援センター）"
              description="弁護士費用の立替制度や、無料法律相談の案内を行う国の機関です。"
              url="https://www.houterasu.or.jp/"
            />
            <ContactCard
              name="都道府県の弁護士会"
              description="各都道府県の弁護士会でも無料相談を実施しています。「○○県 弁護士会 無料相談」で検索してください。"
            />
            <ContactCard
              name="誹謗中傷ホットライン（セーファーインターネット協会）"
              description="SNSの誹謗中傷投稿の削除申請をサポートする団体です。"
              url="https://www.saferinternet.or.jp/"
            />
          </div>
        </section>

        {/* Back Button */}
        <div className="text-center pt-8 border-t border-gray-800">
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

function StepCard({
  number,
  title,
  description,
  example,
}: {
  number: string;
  title: string;
  description: string;
  example?: string;
}) {
  return (
    <div className="flex gap-4 p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{description}</p>
        {example && (
          <p className="mt-2 text-sm text-gray-500 font-mono bg-gray-900 inline-block px-3 py-1 rounded">
            例: {example}
          </p>
        )}
      </div>
    </div>
  );
}

function TermCard({
  term,
  shortDesc,
  description,
}: {
  term: string;
  shortDesc: string;
  description: string;
}) {
  return (
    <div className="p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
      <h3 className="font-semibold text-lg mb-1">{term}</h3>
      <p className="text-blue-400 text-sm mb-3">{shortDesc}</p>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function ContactCard({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url?: string;
}) {
  return (
    <div className="p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
      <h3 className="font-semibold text-lg mb-2">{name}</h3>
      <p className="text-gray-400 leading-relaxed mb-3">{description}</p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          {url}
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      )}
    </div>
  );
}
