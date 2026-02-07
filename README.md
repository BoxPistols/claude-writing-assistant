# Draftline ✍️

AI搭載のリッチテキストエディタ。文法・スペル・句読点・文体・明瞭さを自動分析し、改善提案をリアルタイムで表示します。

## 機能

- 📝 リッチテキストエディタ（フォント、サイズ、色、配置、リスト等）
- 🤖 Claude APIによるテキスト分析
- 🎯 カテゴリ別の改善提案（文法/スペル/句読点/文体/明瞭さ）
- 🌙 ダーク/ライトモード
- 🌐 日本語・英語対応（ブラウザ言語自動検出）
- 📋 ハイライト除去済みコピー

## セットアップ

```bash
npm install
cp .env.example .env
# ANTHROPIC_API_KEY を設定
npm run dev
```

## 技術スタック

- React 18 + Vite
- Tailwind CSS
- Express (API proxy)
- Anthropic Claude API
- Lucide React Icons

## License

MIT
