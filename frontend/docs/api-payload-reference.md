# API Payload Reference

このドキュメントは、バックエンドAPIに送信されるデータ形式をまとめたものです。  
バックエンドは TypeScript (Hono + Vercel AI SDK) で実装されており、Cloud Run 上で動作します。

---

## 廃止されたエンドポイント

| エンドポイント | 廃止理由 |
|---|---|
| `POST /api/edit` | フロントエンドで未使用のため、Python → TypeScript 移行時に廃止 |

---

## 1. `/api/proofread` - 校正API

小説の本文を受け取り、誤字脱字の指摘をJSON形式で返します。

### リクエスト

```typescript
{
  content: string  // 校正対象の本文テキスト（必須・空文字不可）
}
```

### レスポンス（成功時）

```typescript
{
  suggestions: Array<{
    type: string,         // "typo" | "grammar" | "style"
    original: string,     // 誤っている箇所
    suggestion: string,   // 修正案（そのまま置換可能な文章）
    reason: string,       // 修正の理由
    priority: string      // "high" | "medium" | "low"
  }>
}
```

### 注意事項

- `type` と `priority` は文字列型。AI が想定外の値を返す可能性があるため、フロントエンド側でフォールバック処理を行うこと
- 指摘事項がない場合は `suggestions` が空配列になる

---

## 2. `/api/rewrite` - リライトAPI

選択範囲のテキストを指示に従ってリライトします。

### リクエスト

```typescript
{
  data: {
    fullText: string,           // チャプター全体のテキスト（必須）
    selectedText: string,       // 選択されたテキスト（必須）
    instruction: string,        // リライト指示（必須。例: "もっと緊迫感を出して"）
    selectionRange: {           // 選択範囲（null可）
      start: number,
      end: number
    } | null,
    context: {                  // 文脈情報（省略可）
      chapterTitle: string,
      characters: any[],
      mood: string
    }
  }
}
```

### レスポンス（成功時）

```typescript
{
  success: true,
  result: {
    originalText: string,       // 元のテキスト（selectedText と同じ）
    rewrittenText: string,      // リライト後のテキスト
    reason: string,             // リライトの理由・狙った効果の解説
    diffHighlights: Array<{     // 変更箇所のハイライト（空配列の場合あり）
      type: string,             // "change"
      before: string,           // 変更前のフレーズ
      after: string             // 変更後のフレーズ
    }>
  }
}
```

### レスポンス（失敗時 - AIが実行不可能と判断した場合）

```typescript
{
  success: false,
  result: {
    error: string               // エラーの理由
  }
}
```

### 注意事項

- `success` フィールドで成功/失敗を判別する
- `diffHighlights` は AI が省略する場合があるため、空配列をデフォルト値として扱う

---

## 3. `/api/generate-story` - 短編生成API

小説の設定データに基づき、短編小説を生成します。

### リクエスト

```typescript
{
  data: {
    title: string,              // 小説タイトル
    overview: string,           // 小説のあらすじ・概要
    worldSetting: string | null, // 世界観の設定（null可）
    references: {
      correlationMap: Array<{   // キャラクター設定（null可）
        id: string,
        name: string,
        age: string,
        gender: string,
        affiliation: string,    // 所属する国・組織
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
      }> | null,
      plot: Array<{             // プロット（null可）
        title: string,
        scenes: Array<{
          content: string,
          note: string
        }>
      }> | null,
      relationMap: Array<{      // 相関図（null可）
        from: string,
        to: string,
        label: string,
        type: "forward" | "reverse" | "bidirectional" | "none"
      }> | null,
      worldElements: Array<{    // 世界要素（国・組織・制度など）（null可）
        id: string,
        name: string,
        category: string,       // "国家" | "組織" | "制度" | "宗教" | "地域" | "その他"
        description: string
      }> | null
    },
    baseContent: string | null, // 現在のエディタ内容（ベースにする場合）
    config: {
      targetLength: number,     // 希望文字数
      perspective: string,      // 視点（例: "一人称（私・僕）"）
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
{
  data: {
    title: string,              // 小説タイトル
    overview: string,           // 小説全体のあらすじ・概要
    worldSetting: string | null, // 世界観の設定（null可）
    pastContent: Array<{        // 投稿済みエピソード一覧（話数順）
      episodeNumber: number,
      title: string,
      content: string
    }>,
    currentEpisode: number,     // 今回執筆する話数
    references: {
      correlationMap: Array<{   // キャラクター設定（null可）
        id: string,
        name: string,
        age: string,
        gender: string,
        affiliation: string,    // 所属する国・組織
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
      }> | null,
      plot: Array<{             // プロット（null可）
        title: string,
        scenes: Array<{
          content: string,
          note: string
        }>
      }> | null,
      relationMap: Array<{      // 相関図（null可）
        from: string,
        to: string,
        label: string,
        type: "forward" | "reverse" | "bidirectional" | "none"
      }> | null,
      worldElements: Array<{    // 世界要素（国・組織・制度など）（null可）
        id: string,
        name: string,
        category: string,       // "国家" | "組織" | "制度" | "宗教" | "地域" | "その他"
        description: string
      }> | null
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
// バリデーションエラー (400)
{ detail: string }  // リクエスト内容の不備

// 認証エラー (401)
{ detail: string }  // トークン不正・期限切れ

// サーバーエラー (500)
{ detail: string }  // AI生成エラー等
```

### フロントエンドからの呼び出し

フロントエンドでは Server Actions (`app/novel/[slug]/edit/actions.ts`) を経由してAPIを呼び出します。  
コンポーネントからクライアント側で直接 Supabase を叩くのではなく、Server Actions 内で参照データ取得・ペイロード組み立て・API呼び出しをまとめて行います。

#### `generateStory(params: GenerateStoryParams)`

```typescript
type GenerateStoryParams = {
  novelId: string;
  novelTitle: string;
  novelSynopsis: string;
  novelWorldSetting?: string;
  references: {
    useCharacters: boolean;
    usePlot: boolean;
    useRelationships: boolean;
    useWorldElements: boolean;
  };
  baseContent: string | null;
  config: {
    targetLength: number;
    perspective: string;
    instruction: string;
  };
};

// 呼び出し例
const result = await generateStory({
  novelId: novel.id,
  novelTitle: novel.title,
  novelSynopsis: novel.synopsis,
  novelWorldSetting: novel.world_setting,
  references: { useCharacters: true, usePlot: true, useRelationships: false, useWorldElements: true },
  baseContent: null,
  config: { targetLength: 2000, perspective: '一人称（私・僕）', instruction: '' },
});
```

#### `generateLongStory(params: GenerateLongStoryParams)`

```typescript
type GenerateLongStoryParams = {
  novelId: string;
  novelTitle: string;
  novelSynopsis: string;
  novelWorldSetting?: string;
  novelPerspective: string;
  references: {
    useCharacters: boolean;
    usePlot: boolean;
    useRelationships: boolean;
    useWorldElements: boolean;
  };
  currentEpisode: number;
  pastContent: { episodeNumber: number; title: string; content: string }[];
  config: {
    targetLength: number;
    instruction: string;
  };
};

// 呼び出し例
const result = await generateLongStory({
  novelId: novel.id,
  novelTitle: novel.title,
  novelSynopsis: novel.synopsis,
  novelWorldSetting: novel.world_setting,
  novelPerspective: novel.perspective,
  references: { useCharacters: true, usePlot: true, useRelationships: false, useWorldElements: true },
  currentEpisode: 3,
  pastContent: [{ episodeNumber: 1, title: '第1話', content: '...' }],
  config: { targetLength: 3000, instruction: '' },
});
```

#### `fetchPlotListsForNovel(novelId: string)`

プロットリストとカードをサーバー側で取得します。`LongStorySettingsModal` の表示用データを提供します。

```typescript
const result = await fetchPlotListsForNovel(novel.id);
if (result.success && result.data) {
  setPlotLists(result.data);
}
```

#### レスポンス形式（共通）

```typescript
if (result.success && result.data && result.data.generatedStory) {
  const { title, content, summary, aiComment } = result.data.generatedStory;
  // 処理...
}
```
