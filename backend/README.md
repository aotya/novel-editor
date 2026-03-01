# Novel Editor Backend

小説編集アプリのバックエンド API。Hono (TypeScript) + Vercel AI SDK で構築。

## 技術スタック

- **ランタイム**: Node.js 22
- **フレームワーク**: [Hono](https://hono.dev/) + [@hono/node-server](https://github.com/honojs/node-server)
- **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai/) (`ai` + `@ai-sdk/google`)
- **認証**: [jose](https://github.com/panva/jose) (Supabase JWT / JWKS 検証)
- **バリデーション**: [Zod](https://zod.dev/)
- **デプロイ先**: Google Cloud Run (Docker)

## セットアップ

```bash
npm install
```

## 開発

```bash
# ローカル直接起動（ホットリロード付き）
npm run dev

# Docker Compose（プロジェクトルートから）
docker compose up --build
```

開発サーバーは `http://localhost:8080` で起動します。

## ビルド・本番起動

```bash
npm run build    # TypeScript → JavaScript (dist/)
npm start        # dist/index.js を実行
```

## 環境変数

| 変数名 | 必須 | 説明 | デフォルト |
|---|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Google AI API キー | - |
| `SUPABASE_URL` | Yes | Supabase プロジェクト URL（JWT検証用） | - |
| `PORT` | No | サーバーポート（Cloud Run が自動設定） | `8080` |
| `ALLOWED_ORIGINS` | No | CORS 許可オリジン（カンマ区切り） | `localhost:3000` |
| `AI_MODEL_PROOFREAD` | No | 校正用モデル | `gemini-2.5-flash` |
| `AI_MODEL_REWRITE` | No | リライト用モデル | `gemini-2.5-flash` |
| `AI_MODEL_STORY` | No | 生成用モデル | `gemini-2.5-flash` |

## API エンドポイント

すべてのエンドポイントは `Authorization: Bearer <token>` が必要です。

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/` | ヘルスチェック |
| POST | `/api/proofread` | 小説の校正（誤字脱字チェック） |
| POST | `/api/rewrite` | 選択テキストのリライト |
| POST | `/api/generate-story` | 短編小説の生成 |
| POST | `/api/generate-long-story` | 長編小説の続き生成 |

詳細は [`frontend/docs/api-payload-reference.md`](../frontend/docs/api-payload-reference.md) を参照。

## ディレクトリ構成

```
src/
├── index.ts               # エントリポイント（Hono アプリ + サーバー起動）
├── middleware/
│   └── auth.ts            # JWT 認証ミドルウェア
├── routes/
│   ├── proofread.ts       # 校正ルート
│   ├── rewrite.ts         # リライトルート
│   ├── generate-story.ts  # 短編生成ルート
│   └── generate-long-story.ts  # 長編生成ルート
├── ai/
│   ├── client.ts          # AI モデル初期化
│   └── prompts/           # システムプロンプト
│       ├── proofreader.ts
│       ├── rewriter.ts
│       ├── story-generator.ts
│       └── long-story-generator.ts
└── schemas/
    ├── request.ts         # リクエストバリデーション
    ├── proofread.ts       # 校正レスポンススキーマ
    ├── rewrite.ts         # リライトレスポンススキーマ
    └── story.ts           # 生成レスポンススキーマ
```

## Cloud Run デプロイ

```bash
# Cloud Run の環境変数を更新する（初回のみ）
# GOOGLE_GENERATIVE_AI_API_KEY, SUPABASE_URL, ALLOWED_ORIGINS を設定

# ビルド & デプロイ（既存の CI/CD パイプラインを使用）
```

`Dockerfile` はマルチステージビルドで、本番用の軽量イメージを生成します。
