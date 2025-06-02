// app/about/page.tsx

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">PoliForm（ポリフォーム）について</h1>

      <section>
        <h2 className="text-xl font-semibold">1. PoliFormとは？</h2>
        <p>
          PoliFormは、ユーザーがバーチャル政党を自由に作成・公開し、
          他のユーザーと理念を共有・支持し合うことができる、政治参加促進型Webサービスです。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. 名前の由来</h2>
        <p>
          PoliForm は「Politics（政治）」と「Form（形・フォーム）」を組み合わせた造語です。
          <br />
          意味：<strong>「政治を形づくるための、自由なフォーム（器）」</strong>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. サービスの目的</h2>
        <ul className="list-disc ml-5">
          <li>誰でも気軽に政治的意見を表現できる空間を提供する</li>
          <li>自分の理想や提案を“政党”という形で構築・公開できる場を提供する</li>
          <li>多様な価値観やビジョンを可視化し、発見や対話のきっかけを作る</li>
          <li>バーチャル政党を通じて、現実の政治団体や市民活動への橋渡しを目指す</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. 主な機能</h2>
        <ul className="list-disc ml-5">
          <li>政党の作成（理念・政策・ロゴ・タグなど）</li>
          <li>政党の閲覧・検索・支持</li>
          <li>マイページでの管理（作成政党・支持履歴）</li>
          <li>思想マッチング（DISCOVER）※将来機能</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. 想定ユーザー</h2>
        <ul className="list-disc ml-5">
          <li>自分の政治的意見を表現したい人</li>
          <li>若年層や投票未経験層</li>
          <li>政治を身近に体験したい教育関係者</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. 技術構成（MVP）</h2>
        <ul className="list-disc ml-5">
          <li>Next.js（App Router）＋ Tailwind CSS</li>
          <li>認証：Supabase Auth（Googleログイン）</li>
          <li>データベース：Supabase</li>
          <li>ホスティング：Vercel</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. ChatGPTの活用について</h2>
        <p>
            PoliFormの開発においては、OpenAIのChatGPTを活用し、以下の支援を受けています：
        </p>
        <ul className="list-disc ml-5 mt-2">
            <li>画面設計や機能設計のブレインストーミング</li>
            <li>Next.js／Supabaseの実装方針の整理</li>
            <li>コードレビューやバグの特定支援</li>
            <li>プロダクトの説明文や名称案の生成</li>
        </ul>
        <p className="mt-2">
            AIツールを効果的に活用することで、スピーディかつ高品質な開発を実現しています。
        </p>
      </section>

    </div>
  )
}
