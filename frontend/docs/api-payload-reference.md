# API Payload Reference

このドキュメントは、バックエンドAPIに送信されるデータ形式をまとめたものです。

---

## 1. `/api/proofread` - 校正API

小説の本文を受け取り、誤字脱字の指摘をJSON形式で返します。

### リクエスト

```typescript
// EditRequest
{
  content: string  // 校正対象の本文テキスト
}
```

### レスポンス

```typescript
{
  suggestions: [
    {
      type: "typo" | "grammar" | "style",
      original: string,      // 元のテキスト
      suggestion: string,    // 修正案
      reason: string         // 修正理由
    }
  ]
}
```

---

## 2. `/api/rewrite` - リライトAPI

選択範囲のテキストを指示に従ってリライトします。

### リクエスト

```typescript
// RewriteRequest
{
  data: {
    mode: "rewrite",
    fullText: string,           // チャプター全体のテキスト
    selectedText: string,       // 選択されたテキスト
    instruction: string,        // リライト指示（例: "もっと緊迫感を出して"）
    selectionRange: {
      start: number,            // 選択開始位置
      end: number               // 選択終了位置
    } | null,
    context: {
      chapterTitle: string,     // チャプタータイトル
      characters: any[],        // キャラクター情報（未実装）
      mood: string              // ムード（未実装）
    }
  }
}
```

### レスポンス

```typescript
{
  result: {
    originalText: string,    // 元のテキスト
    rewrittenText: string,   // リライト後のテキスト
    reason: string           // リライトの理由・説明
  }
}
```

---

## 3. `/api/generate-story` - 短編生成API

小説の設定データに基づき、短編小説を生成します。

### リクエスト

```typescript
// StoryGenRequest
{
  data: {
    title: string,              // 小説タイトル
    overview: string,           // 小説のあらすじ・概要
    references: {
      correlationMap: [         // キャラクター設定（null可）
        {
          id: string,
          name: string,
          age: string,
          gender: string,
          appearance: string,
          first_person: string,   // 一人称（俺、私など）
          second_person: string,  // 二人称
          speech_style: string,   // 口調
          personality: string,
          sample_dialogue: string,
          battle_type: string,
          magic: string,
          other_notes: string,
          role: string,
          bio: string,
          is_main: boolean
        }
      ] | null,
      plot: [                   // プロット（null可）
        {
          title: string,        // リスト名（例: "第1章"）
          scenes: [
            {
              content: string,  // シーン内容
              note: string      // メモ
            }
          ]
        }
      ] | null,
      relationMap: [            // 相関図（null可）
        {
          from: string,         // キャラクター名（起点）
          to: string,           // キャラクター名（終点）
          label: string,        // 関係性ラベル（例: "幼馴染"）
          type: "forward" | "reverse" | "bidirectional" | "none"
        }
      ] | null
    },
    baseContent: string | null, // 現在のエディタ内容（ベースにする場合）
    config: {
      targetLength: number,     // 希望文字数
      perspective: string,      // 視点（例: "一人称（私・僕）"）
      style: "novel",
      instruction: string       // 追加の指示
    }
  }
}
```

### レスポンス

```typescript
{
  generatedStory: {
    title: string,      // 生成された小説のタイトル
    content: string,    // 小説本文（改行は \n）
    summary: string,    // 100文字程度のあらすじ
    aiComment: string   // 執筆の意図や工夫した点
  }
}
```

---

## 4. `/api/generate-long-story` - 長編生成API

小説の設定データとこれまでの文脈に基づき、長編小説の続きを生成します。

### リクエスト

```typescript
// StoryGenRequest
{
  data: {
    title: string,              // 小説タイトル
    overview: string,           // 小説全体のあらすじ・概要
    pastContent: [              // 投稿済みエピソード一覧（話数順）
      {
        episodeNumber: number,  // 話数（1, 2, 3...）
        title: string,          // その話のタイトル
        content: string         // その話の本文（プレーンテキスト）
      }
    ],
    currentEpisode: number,     // 今回執筆する話数
    references: {
      correlationMap: [         // キャラクター設定（null可）
        {
          id: string,
          name: string,
          age: string,
          gender: string,
          appearance: string,
          first_person: string,
          second_person: string,
          speech_style: string,
          personality: string,
          sample_dialogue: string,
          battle_type: string,
          magic: string,
          other_notes: string,
          role: string,
          bio: string,
          is_main: boolean
        }
      ] | null,
      plot: [                   // プロット（null可）
        {
          title: string,
          scenes: [
            {
              content: string,
              note: string
            }
          ]
        }
      ] | null,
      relationMap: [            // 相関図（null可）
        {
          from: string,
          to: string,
          label: string,
          type: "forward" | "reverse" | "bidirectional" | "none"
        }
      ] | null
    },
    config: {
      targetLength: number,     // 希望文字数
      perspective: string,      // 視点（小説設定から取得）
      instruction: string       // 今回の執筆指示
    }
  }
}
```

### レスポンス

```typescript
{
  generatedStory: {
    title: string,      // 今回の章やシーンのタイトル
    content: string,    // 小説本文（改行は \n）
    summary: string,    // 今回執筆した範囲の100文字程度のあらすじ
    aiComment: string   // 執筆の意図、伏線の配置、前後の文脈との整合性についてのコメント
  }
}
```

### 注意事項

- `pastContent` には **ステータスが「投稿済み（published）」** かつ **「話数（episode_number）が設定されている」** チャプターのみが含まれます
- `pastContent` が空の場合、フロントエンドの「生成を実行」ボタンは無効化されます
- `config.perspective` は小説設定の「視点」から自動取得されます

---

## 共通事項

### 認証

すべてのAPIエンドポイントは認証が必要です。

```
Authorization: Bearer <supabase_access_token>
```

### エラーレスポンス

```typescript
{
  detail: string  // エラーメッセージ
}
```

### フロントエンドからの呼び出し

フロントエンドでは Server Actions (`app/novel/[slug]/edit/actions.ts`) を経由してAPIを呼び出します。

```typescript
// 例: 長編生成
const result = await generateLongStory(payload);

if (result.success && result.data && result.data.generatedStory) {
  const { title, content, summary, aiComment } = result.data.generatedStory;
  // 処理...
}
```
