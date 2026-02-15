# バックエンド移行仕様書: Python → TypeScript (Cloud Run 継続)

## 概要

Python (FastAPI + google-genai) で構築されたバックエンドを TypeScript に書き換える。  
インフラ構成（Vercel + Cloud Run）は変更しない。

### 移行の目的

- フロントエンド (TypeScript) とバックエンドの言語統一による保守性の向上
- LLMプロバイダーのマルチモデル対応（Gemini以外も選択可能に）
- Zod スキーマによる型安全なAI出力（正規表現JSONパースの廃止）

### 変更しないもの

- デプロイ先（frontend: Vercel / backend: Cloud Run）
- フロントエンドの Server Actions による API 呼び出しパターン
- CORS 設定・JWT 認証の仕組み
- API のリクエスト/レスポンス形式（フロントエンドから見た互換性を維持）

---

## アーキテクチャ

### 現行

```
[ブラウザ] → [Vercel (Next.js)] → fetch → [Cloud Run (FastAPI / Python)] → [Gemini API]
              Server Actions              JWT認証 + CORS
```

### 移行後

```
[ブラウザ] → [Vercel (Next.js)] → fetch → [Cloud Run (Hono / TypeScript)] → [Gemini API]
              Server Actions              JWT認証 + CORS（同じ）
```

変更点はバックエンドの言語とフレームワークのみ。フロントエンドは **変更なし**。

---

## 技術スタック変更

| 項目 | 現行 (Python) | 移行後 (TypeScript) |
|---|---|---|
| 言語 | Python 3.11 | Node.js 22 (TypeScript) |
| Web フレームワーク | FastAPI | Hono |
| AI SDK | `google-genai` (Gemini専用) | `ai` + `@ai-sdk/google` (Vercel AI SDK) |
| 認証 | `PyJWT` + JWKS手動検証 | `jose` (JWKS検証) |
| バリデーション | `pydantic` | `zod` |
| JSON パース | 正規表現で手動抽出 | Vercel AI SDK の `generateObject` (Structured Output) |
| 環境変数管理 | `python-dotenv` | `dotenv` (or Node.js 組み込み `--env-file`) |
| CORS | FastAPI CORSMiddleware | Hono CORS Middleware |
| コンテナ | `python:3.11-slim` | `node:22-slim` |
| プロセス管理 | `uvicorn` | `tsx` (開発) / `node` (本番) |

### Hono を選ぶ理由

| フレームワーク | 特徴 |
|---|---|
| **Hono** | 軽量・高速。TypeScript ファースト。ミドルウェアが豊富。Cloud Run 向き。FastAPI に最も近い開発体験 |
| Express | 老舗だがTypeScript対応が後付け。ボイラープレートが多い |
| Fastify | 高機能だが今回の用途にはオーバースペック |

> **補足**: Vercel AI SDK はあくまで npm パッケージ（`ai`）であり、Vercel プラットフォームへの依存は発生しない。  
> Node.js が動く環境（Cloud Run 含む）でどこでも使える。

---

## ファイル構成

### 削除対象（現行 Python コード）

```
backend/
├── main.py                    # FastAPI アプリケーション
├── requirements.txt           # Python 依存関係
├── Dockerfile                 # Python コンテナ
├── .dockerignore
├── README.md
└── novel_adk/                 # Python エージェント
    ├── __init__.py
    ├── base.py
    ├── agent.py
    ├── proofreader.py
    ├── rewriter.py
    ├── story_generator.py
    └── long_story_generator.py
```

### 新規作成（TypeScript コード）

```
backend/
├── src/
│   ├── index.ts               # Hono アプリケーション（エントリポイント）
│   ├── middleware/
│   │   └── auth.ts            # JWT認証ミドルウェア
│   ├── routes/
│   │   ├── proofread.ts       # POST /api/proofread
│   │   ├── rewrite.ts         # POST /api/rewrite
│   │   ├── generate-story.ts  # POST /api/generate-story
│   │   └── generate-long-story.ts  # POST /api/generate-long-story
│   ├── ai/
│   │   ├── client.ts          # AI モデル初期化
│   │   └── prompts/           # システムプロンプト定義
│   │       ├── proofreader.ts
│   │       ├── rewriter.ts
│   │       ├── story-generator.ts
│   │       └── long-story-generator.ts
│   └── schemas/
│       ├── proofread.ts       # Zod スキーマ（校正）
│       ├── rewrite.ts         # Zod スキーマ（リライト）
│       └── story.ts           # Zod スキーマ（生成）
├── package.json
├── tsconfig.json
├── Dockerfile                 # Node.js コンテナ（Cloud Run 用）
├── .dockerignore
└── README.md
```

### 変更対象

| ファイル | 変更内容 |
|---|---|
| `docker-compose.yml` | backend の build context / command を TypeScript 用に変更 |
| `.env` | `GOOGLE_API_KEY` → `GOOGLE_GENERATIVE_AI_API_KEY` に変更 |

### フロントエンド（変更なし）

`frontend/app/novel/[slug]/edit/actions.ts` の Server Actions は変更不要。  
バックエンドの API 仕様（エンドポイント、リクエスト/レスポンス形式）が同一のため。

---

## バックエンド実装詳細

### エントリポイント

```typescript
// backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { proofreadRoute } from './routes/proofread';
import { rewriteRoute } from './routes/rewrite';
import { generateStoryRoute } from './routes/generate-story';
import { generateLongStoryRoute } from './routes/generate-long-story';
import { authMiddleware } from './middleware/auth';

const app = new Hono();

// ミドルウェア
app.use('*', logger());
app.use('/api/*', cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || []),
  ],
  credentials: true,
}));
app.use('/api/*', authMiddleware);

// ヘルスチェック
app.get('/', (c) => c.json({ status: 'ok' }));

// ルート
app.route('/api', proofreadRoute);
app.route('/api', rewriteRoute);
app.route('/api', generateStoryRoute);
app.route('/api', generateLongStoryRoute);

// サーバー起動
const port = Number(process.env.PORT) || 8080;
console.log(`Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

---

### JWT 認証ミドルウェア

```typescript
// backend/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const JWKS_URL = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` : null;

// JWKS リモートキーセット（鍵を自動取得・キャッシュ）
const jwks = JWKS_URL
  ? jose.createRemoteJWKSet(new URL(JWKS_URL))
  : null;

export const authMiddleware = createMiddleware(async (c, next) => {
  if (!jwks) {
    return c.json({ detail: 'Supabase URL is not configured' }, 500);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ detail: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      algorithms: ['HS256', 'ES256'],
    });

    if (!payload.sub) {
      return c.json({ detail: 'Invalid token: missing sub claim' }, 401);
    }

    // ユーザー情報をコンテキストに保存
    c.set('user', payload);
    await next();
  } catch (e: any) {
    return c.json({ detail: `Could not validate credentials: ${e.message}` }, 401);
  }
});
```

---

### エンドポイント別 移行仕様

#### 1. POST `/api/proofread` - 校正API

**現行 (Python)**
```python
@app.post("/api/proofread")
def proofread_novel(request: EditRequest, user=Depends(get_current_user)):
    raw_response = proofreader_agent.generate_response(request.content)
    return parse_json_response(raw_response)
```

**移行後 (TypeScript)**
```typescript
// backend/src/routes/proofread.ts
import { Hono } from 'hono';
import { generateObject } from 'ai';
import { proofreadModel } from '../ai/client';
import { proofreadSchema } from '../schemas/proofread';
import { PROOFREADER_PROMPT } from '../ai/prompts/proofreader';

const proofreadRoute = new Hono();

proofreadRoute.post('/proofread', async (c) => {
  const { content } = await c.req.json();

  const { object } = await generateObject({
    model: proofreadModel,
    schema: proofreadSchema,
    system: PROOFREADER_PROMPT,
    prompt: content,
  });

  return c.json(object);
});

export { proofreadRoute };
```

```typescript
// backend/src/schemas/proofread.ts
import { z } from 'zod';

export const proofreadSchema = z.object({
  suggestions: z.array(z.object({
    type: z.enum(['typo', 'grammar', 'style']),
    original: z.string(),
    suggestion: z.string(),
    reason: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
});
```

**ポイント**
- `generateObject` + Zod スキーマにより、正規表現JSONパース（`parse_json_response`）が不要に
- レスポンス形式はフロントエンドから見て同一

---

#### 2. POST `/api/rewrite` - リライトAPI

**移行後 (TypeScript)**
```typescript
// backend/src/routes/rewrite.ts
import { Hono } from 'hono';
import { generateObject } from 'ai';
import { rewriteModel } from '../ai/client';
import { rewriteSchema } from '../schemas/rewrite';
import { REWRITER_PROMPT } from '../ai/prompts/rewriter';

const rewriteRoute = new Hono();

rewriteRoute.post('/rewrite', async (c) => {
  const { data } = await c.req.json();
  const prompt = JSON.stringify(data, null, 2);

  const { object } = await generateObject({
    model: rewriteModel,
    schema: rewriteSchema,
    system: REWRITER_PROMPT,
    prompt,
  });

  return c.json(object);
});

export { rewriteRoute };
```

```typescript
// backend/src/schemas/rewrite.ts
import { z } from 'zod';

export const rewriteSchema = z.object({
  success: z.boolean(),
  result: z.object({
    originalText: z.string(),
    rewrittenText: z.string(),
    reason: z.string(),
    diffHighlights: z.array(z.object({
      type: z.string(),
      before: z.string(),
      after: z.string(),
    })),
  }),
});
```

---

#### 3. POST `/api/generate-story` - 短編生成API

**移行後 (TypeScript)**
```typescript
// backend/src/routes/generate-story.ts
import { Hono } from 'hono';
import { generateObject } from 'ai';
import { storyModel } from '../ai/client';
import { storySchema } from '../schemas/story';
import { STORY_GENERATOR_PROMPT } from '../ai/prompts/story-generator';

const generateStoryRoute = new Hono();

generateStoryRoute.post('/generate-story', async (c) => {
  const { data } = await c.req.json();
  const prompt = JSON.stringify(data, null, 2);

  const { object } = await generateObject({
    model: storyModel,
    schema: storySchema,
    system: STORY_GENERATOR_PROMPT,
    prompt,
  });

  return c.json(object);
});

export { generateStoryRoute };
```

```typescript
// backend/src/schemas/story.ts
import { z } from 'zod';

// 短編生成・長編生成で共通
export const storySchema = z.object({
  generatedStory: z.object({
    title: z.string(),
    content: z.string(),
    summary: z.string(),
    aiComment: z.string(),
  }),
});
```

---

#### 4. POST `/api/generate-long-story` - 長編生成API

**移行後 (TypeScript)**
```typescript
// backend/src/routes/generate-long-story.ts
import { Hono } from 'hono';
import { generateObject } from 'ai';
import { storyModel } from '../ai/client';
import { storySchema } from '../schemas/story';
import { LONG_STORY_GENERATOR_PROMPT } from '../ai/prompts/long-story-generator';

const generateLongStoryRoute = new Hono();

generateLongStoryRoute.post('/generate-long-story', async (c) => {
  const { data } = await c.req.json();
  const prompt = JSON.stringify(data, null, 2);

  const { object } = await generateObject({
    model: storyModel,
    schema: storySchema,
    system: LONG_STORY_GENERATOR_PROMPT,
    prompt,
  });

  return c.json(object);
});

export { generateLongStoryRoute };
```

> スキーマは `generate-story` と共通（`storySchema`）。プロンプトのみ異なる。

---

## AI クライアント設定

```typescript
// backend/src/ai/client.ts
import { google } from '@ai-sdk/google';

// 環境変数でモデルを切り替え可能
// GOOGLE_GENERATIVE_AI_API_KEY は Vercel AI SDK が自動的に参照する
export const proofreadModel = google(
  process.env.AI_MODEL_PROOFREAD || 'gemini-2.5-flash'
);

export const rewriteModel = google(
  process.env.AI_MODEL_REWRITE || 'gemini-2.5-flash'
);

export const storyModel = google(
  process.env.AI_MODEL_STORY || 'gemini-2.5-flash'
);
```

### マルチプロバイダー切り替え（将来拡張）

Vercel AI SDK のプロバイダーを差し替えるだけで他モデルに変更可能:

```typescript
// OpenAI に切り替える場合
import { openai } from '@ai-sdk/openai';
export const proofreadModel = openai('gpt-4o');

// Anthropic に切り替える場合
import { anthropic } from '@ai-sdk/anthropic';
export const proofreadModel = anthropic('claude-sonnet-4-20250514');
```

---

## システムプロンプト移行

各エージェントのシステムプロンプトを TypeScript の定数として移植する。

### ファイル構成

```
backend/src/ai/prompts/
├── proofreader.ts          # PROOFREADER_PROMPT
├── rewriter.ts             # REWRITER_PROMPT
├── story-generator.ts      # STORY_GENERATOR_PROMPT
└── long-story-generator.ts # LONG_STORY_GENERATOR_PROMPT
```

### 例: proofreader.ts

```typescript
export const PROOFREADER_PROMPT = `あなたはプロの校正者です。
ユーザーから提供された小説のテキストを確認し、誤字脱字、文法の間違い、不適切な表現を見つけてください。

修正案は、そのまま文章と入れ替える予定なので、修正案は文章として出力してください。
そのままコピペできない文章は避けてください（提案は「修正の理由」に記載してください）

指摘事項がない場合は、空の配列を返してください。`;
```

> **注意**: 現行のプロンプトにある JSON 出力形式の指示は、`generateObject` の Zod スキーマが自動で担うため、プロンプトからは削除する。

---

## Docker 関連

### Dockerfile（本番用 / Cloud Run）

```dockerfile
# backend/Dockerfile
FROM node:22-slim AS builder

WORKDIR /app

# 依存関係のインストール
COPY package.json package-lock.json ./
RUN npm ci

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# --- 本番ステージ ---
FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

# 本番依存関係のみインストール
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# 非ルートユーザーの作成
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser --ingroup appgroup
RUN chown -R appuser:appgroup /app

USER appuser

# Cloud Run は PORT 環境変数を提供
CMD ["node", "dist/index.js"]
```

### Dockerfile.dev（ローカル開発用）

```dockerfile
# backend/Dockerfile.dev
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# tsx でホットリロード付き開発
CMD ["npx", "tsx", "watch", "src/index.ts"]
```

### docker-compose.yml（変更後）

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      - PORT=3000
      - BACKEND_API_URL=${BACKEND_API_URL:-http://backend:8080}
      - WATCHPACK_POLLING=true
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev        # Python Dockerfile → Dockerfile.dev に変更
    ports:
      - "8080:8080"
    env_file:
      - .env
    environment:
      - PORT=8080
    volumes:
      - ./backend:/app
      - /app/node_modules               # 追加: node_modules をボリュームで除外
    # command: uvicorn ... → 削除（Dockerfile.dev の CMD を使用）
```

---

## package.json

```json
{
  "name": "novel-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "hono": "^4",
    "ai": "^4",
    "@ai-sdk/google": "^1",
    "jose": "^6",
    "zod": "^3",
    "dotenv": "^16"
  },
  "devDependencies": {
    "typescript": "^5",
    "tsx": "^4",
    "@types/node": "^22"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 環境変数

### 変更一覧

| 変数 | 変更 |
|---|---|
| `GOOGLE_API_KEY` | `GOOGLE_GENERATIVE_AI_API_KEY` に変更（Vercel AI SDK が自動参照する変数名） |
| `GENERATIVE_MODEL` | `AI_MODEL_PROOFREAD` に名称変更 |
| `GENERATIVE_MODEL_3` | `AI_MODEL_REWRITE` / `AI_MODEL_STORY` に分割 |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | 変更なし |
| `ALLOWED_ORIGINS` | 変更なし |
| `BACKEND_API_URL` | 変更なし |
| `ENABLE_DOCS` | **削除**（Hono には不要） |
| `PORT` | 変更なし（Cloud Run が提供） |

### .env の変更イメージ

```bash
# 変更前
GOOGLE_API_KEY=your-api-key
GENERATIVE_MODEL=gemini-2.5-flash
GENERATIVE_MODEL_3=gemini-2.5-flash

# 変更後
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
AI_MODEL_PROOFREAD=gemini-2.5-flash
AI_MODEL_REWRITE=gemini-2.5-flash
AI_MODEL_STORY=gemini-2.5-flash
```

---

## 移行手順（推奨）

段階的に移行し、各ステップで動作確認を行う。

### Phase 1: 準備（ブランチ: `feature/migrate-backend-to-ts`）

1. `feature/migrate-backend-to-ts` ブランチを作成
2. `backend/` 内の Python ファイルを退避（一時的に `backend/_python_backup/` 等に移動）
3. `backend/` に TypeScript プロジェクトを初期化（`package.json`, `tsconfig.json`）
4. パッケージインストール（`hono`, `ai`, `@ai-sdk/google`, `jose`, `zod`, `dotenv`, `tsx`, `typescript`）
5. `Dockerfile` と `Dockerfile.dev` を作成
6. `.env` の環境変数名を更新

### Phase 2: 基盤実装

7. `src/index.ts`（Hono アプリ + CORS + ヘルスチェック）を実装
8. `src/middleware/auth.ts`（JWT認証）を実装
9. `docker-compose.yml` を更新
10. `docker compose up` でヘルスチェック（`GET /`）が動くことを確認

### Phase 3: エンドポイント移行（1つずつ）

11. `/api/proofread` を実装 → フロントエンドから動作確認
12. `/api/rewrite` を実装 → 動作確認
13. `/api/generate-story` を実装 → 動作確認
14. `/api/generate-long-story` を実装 → 動作確認

### Phase 4: クリーンアップ

15. Python バックアップファイルを削除
16. Cloud Run にデプロイして本番動作確認
17. `api-payload-reference.md` を更新（必要に応じて）
18. `develop` ブランチにマージ

---

## Cloud Run デプロイ

### 変更点

| 項目 | 現行 | 移行後 |
|---|---|---|
| ベースイメージ | `python:3.11-slim` | `node:22-slim`（マルチステージ） |
| 起動コマンド | `uvicorn main:app --host 0.0.0.0 --port ${PORT}` | `node dist/index.js` |
| ビルドステップ | なし（インタプリタ） | `npm run build` (tsc) |

Cloud Run の設定（リージョン、メモリ、CPU、最小/最大インスタンス数等）は変更不要。  
`PORT` 環境変数は Cloud Run が自動提供し、Hono がそれを参照する。

---

## リスクと注意点

| リスク | 対策 |
|---|---|
| `generateObject` がスキーマ通りに返さない場合 | Zod の `.catch()` / `.default()` でフォールバック値を設定 |
| プロンプト移行時の出力品質の差異 | 移行後に各エンドポイントの出力を現行 Python 版と比較テスト |
| Node.js の Cloud Run コールドスタート | Python とほぼ同等。マルチステージビルドで軽量化済み |
| ローカル開発の Docker 再構築 | `node_modules` をボリュームで除外し、初回 `npm ci` 後はキャッシュ |

---

## 現行 Python エージェントのプロンプト全文（参照用）

移行時のコピー元として、各エージェントのシステムプロンプト全文を記録する。

<details>
<summary>proofreader (校正)</summary>

```
あなたはプロの校正者です。
ユーザーから提供された小説のテキストを確認し、誤字脱字、文法の間違い、不適切な表現を見つけてください。

**必ず以下のJSON形式でのみ出力してください。Markdownのコードブロックなどは含めないでください。**
**修正案は、そのまま文章と入れ替える予定なので、修正案は文章として出力してください。そのままコピペできない文章は避けてください（提案は「修正の理由」に記載してください）**

{
  "suggestions": [
    {
      "type": "typo",
      "original": "誤っている箇所",
      "suggestion": "修正案",
      "reason": "修正の理由",
      "priority": "high"
    }
  ]
}

指摘事項がない場合は、空の配列を持つJSONを返してください。
{
  "suggestions": []
}
```

</details>

<details>
<summary>rewriter (リライト)</summary>

```
あなたは熟練の小説リライター（推敲・改稿のプロ）です。
ユーザーから提供された「小説の全文(fullText)」「書き換え対象のテキスト(selectedText)」「書き換え指示(instruction)」「文脈情報(context)」をもとに、対象部分をリライトしてください。

**入力情報の扱い方:**
1. **fullText**: 物語全体の流れやトーンを把握するために使います。
2. **selectedText**: ここが今回書き換えるべき具体的な箇所です。
3. **instruction**: どのように書き換えるかの具体的な指示です（例：描写を増やす、セリフを変える等）。
4. **context**: キャラクターの設定やシーンの雰囲気などを考慮するために使います。

**出力形式:**
必ず以下のJSON形式（スキーマ）のみを出力してください。Markdownコードブロックは含めないでください。

{
  "success": true,
  "result": {
    "originalText": "元のテキスト（selectedTextと同じ）",
    "rewrittenText": "書き換え後のテキスト",
    "reason": "なぜこのように書き換えたのか、どのような効果を狙ったのかの解説",
    "diffHighlights": [
      {
        "type": "change",
        "before": "変更前の部分的なフレーズ",
        "after": "変更後の部分的なフレーズ"
      }
    ]
  }
}

**注意点:**
- `rewrittenText` は、前後の文脈（fullTextの対象箇所の前後）と自然に繋がるようにしてください。
- `diffHighlights` は、具体的にどこがどう変わったかを分かりやすく示すためのものです。全体が大きく変わった場合は、代表的な変更点をいくつか挙げるか、全体を1つのchangeとしても構いません。
- `reason` はユーザー（作者）にとって学びのある建設的な内容にしてください。

**エラーハンドリング:**
もし指示が実行不可能であったり、入力に不備がある場合は、`success: false` とし、`result` 内に `error` メッセージを含めてください。
```

</details>

<details>
<summary>story-generator (短編生成)</summary>

```
あなたはプロの小説家アシスタントです。
ユーザーから提供される「小説の設定データ（JSON）」に基づき、短編小説を執筆してください。

# 制約事項
1. **出力形式**: 必ず以下のJSONフォーマットのみを出力してください。Markdown記法や前置きは不要です。
   {
     "generatedStory": {
       "title": "String (タイトル)",
       "content": "String (小説本文。改行は \n を使用)",
       "summary": "String (100文字程度のあらすじ)",
       "aiComment": "String (執筆の意図や工夫した点)"
     }
   }

2. **執筆ルール**:
   - `config.targetLength` で指定された文字数を目安に構成してください。
   - `config.perspective` （視点）を厳守してください。
   - `config.instruction` （追加指示）の内容を物語の核に据え、ユーザーの要望を最優先に反映させてください。
   - **入力データの `references` フィールドに具体的なデータ（キャラクター設定、プロット、相関関係等）が含まれている場合、その設定を最大限尊重し、矛盾がないように執筆してください。**
   - **`baseContent` が提供されている場合**: その内容を続きとして執筆するか、その文体や設定を色濃く反映させてください。

3. **入力データの解釈**:
   - 入力されたJSONの各フィールド（`title`, `overview`, `config`, `references`, `baseContent`）を直接参照して執筆を行ってください。
```

</details>

<details>
<summary>long-story-generator (長編生成)</summary>

```
あなたは長編小説の執筆を行うプロの小説家です。
ユーザーから提供される「小説の設定データ（JSON）」に基づき、指定された話数のエピソードを執筆してください。

# 制約事項
1. **出力形式**: 必ず以下のJSONフォーマットのみを出力してください。Markdown記法や前置きは不要です。
   {
     "generatedStory": {
       "title": "String (今回の章やシーンのタイトル)",
       "content": "String (小説本文。改行は \n を使用)",
       "summary": "String (今回執筆した範囲の100文字程度のあらすじ)",
       "aiComment": "String (執筆の意図、伏線の配置、前後の文脈との整合性についてのコメント)"
     }
   }

2. **執筆ルール**:
   - **第1話の場合（pastContentが空）**: 小説の `overview`（あらすじ）と `references`（キャラクター設定等）を元に、物語の導入部を執筆してください。読者を引き込む魅力的な冒頭を心がけてください。
   - **第2話以降の場合（pastContentがある）**: `pastContent`（これまでの執筆内容）を熟読し、キャラクターの口調、行動原理、物語のトーン、既出の事実と矛盾しないように執筆してください。
   - **構成**: 短編のように1回で完結させるのではなく、長編の一部としての役割（伏線の提示、展開、次章への引きなど）を意識してください。
   - `config.targetLength` で指定された文字数を目安に構成してください。
   - `config.instruction` （今回の執筆範囲への指示）がある場合、そのイベントや展開を必ず盛り込んでください。

3. **入力データの解釈**:
   以下のフィールドを参照して執筆を行ってください。
   - `title`: 小説全体のタイトル
   - `overview`: 小説全体のあらすじ・概要
   - `pastContent`: これまでの執筆内容（投稿済みの話のみ）。ここにある出来事を「過去の事実」として扱ってください。
     - 各話は `episodeNumber`（話数）と `content`（本文またはあらすじ）を持ちます。
     - **注意**: `pastContent` が空の場合は第1話を執筆します。
   - `currentEpisode`: 今回執筆する話数（例: 1 なら「第1話」、5 なら「第5話」を執筆）
   - `config`: 執筆設定
     - `targetLength`: 目標文字数
     - `perspective`: 視点（一人称/三人称など）
     - `instruction`: 今回のシーン・章で描くべき具体的な内容や展開の指示
   - `references`: キャラクター設定、世界観設定など

4. **話数の確認**:
   - 執筆前に `pastContent` の話数と `currentEpisode` を確認してください。
   - `pastContent` が空で `currentEpisode` が 1 なら、物語の第1話（導入部）を執筆します。
   - `pastContent` に第1話〜第4話があり、`currentEpisode` が 5 なら、第4話の続きとして第5話を執筆します。
   - 話数の連続性を意識し、前話の終わり方を踏まえた自然な導入を心がけてください。

5. **禁止事項**:
   - ユーザーの指示がない限り、物語を勝手に完結させないでください。
   - `pastContent` で確立された設定を無視しないでください。
   - 既に投稿済みの話数と矛盾する内容を書かないでください。
```

</details>
