# フロントエンド テストガイド（Vitest）

このドキュメントは、フロントエンドの Vitest によるテストの実行方法・追加方法・メンテナンス方法をまとめたものです。

---

## 1. 概要

### スコープ

このプロジェクトのフロントエンドテストは、**「バックエンド AI API に送信されるリクエスト payload の形が壊れていないか」** を検知することを主目的としています。

### 対象範囲

| 対象 | テスト | 理由 |
|---|---|---|
| `app/novel/[slug]/edit/actions.ts` の AI 系 3 関数（`rewriteContent` / `generateStory` / `generateLongStory`） | あり | 引数の組み合わせによって payload の形が大きく変わるため、回帰しやすい |
| `lib/tiptap-utils.ts`（Tiptap doc → text 変換） | あり | 純関数で網羅テストの ROI が高い |
| CRUD 系 Server Actions（`updateChapterContent` 等） | なし | Supabase 呼び出しを spy するだけになり、保守コストが見合わない |
| UI コンポーネント（Tiptap, dnd-kit を含むもの） | なし | mock の構築コストが本体実装を上回る。E2E 向き |
| バックエンド Zod スキーマとの契約検証 | なし | 必要になったら別途検討（後述「拡張アイデア」） |

---

## 2. 実行方法

すべて `frontend/` ディレクトリ配下で実行します。

### ウォッチモード（開発中）

```bash
cd frontend
npm test
```

ファイル変更を検知して該当テストのみ自動実行されます。

### ワンショット実行（CI、コミット前確認）

```bash
cd frontend
npm run test:run
```

### 特定ファイルだけ実行

```bash
npm test -- lib/tiptap-utils.test.ts
npm test -- "app/novel/[slug]/edit/actions.test.ts"
```

### 特定の `it` だけ実行

```bash
npm test -- -t "novelPerspective が config.perspective に注入される"
```

---

## 3. ファイル構成

```
frontend/
├── vitest.config.ts              ← Vitest 設定（node 環境、パスエイリアス解決）
├── tsconfig.json                 ← `types` に `vitest/globals` を追加済
├── lib/
│   ├── tiptap-utils.ts
│   └── tiptap-utils.test.ts      ← 純関数の網羅テスト
└── app/novel/[slug]/edit/
    ├── actions.ts
    └── actions.test.ts           ← AI 系 3 関数の payload テスト
```

### 命名規則

- テストファイルは対象ファイルと**同じディレクトリ**に置く（`*.test.ts`）
- これにより「実装を読む人」が**テストの存在に気づきやすい**

---

## 4. 設定ファイル

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
  },
});
```

| 項目 | 値 | 理由 |
|---|---|---|
| `environment` | `'node'` | Server Actions の純ロジックをテストするため。jsdom は不要 |
| `globals` | `true` | `describe` / `it` / `expect` / `vi` を import 不要で使えるようにする |
| `vite-tsconfig-paths` | 有効 | `@/lib/...` のパスエイリアスを解決 |

### `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "types": ["node", "vitest/globals"]
  },
  "include": [
    "vitest.config.ts",
    // ...
  ]
}
```

`vitest/globals` を types に追加することで、テストファイル中の `vi`, `expect`, `describe` 等が **import なしでも型推論される**。

---

## 5. テストの書き方（パターン集）

### パターン A：純関数のテスト（`tiptap-utils.test.ts` 形式）

入力と期待出力をシンプルに対応させる：

```ts
import { tiptapDocToText } from './tiptap-utils';

describe('tiptapDocToText', () => {
  it('文字列をそのまま返す', () => {
    expect(tiptapDocToText('plain')).toBe('plain');
  });

  it('複数 paragraph は改行で連結する', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ text: 'a' }] },
        { type: 'paragraph', content: [{ text: 'b' }] },
      ],
    };
    expect(tiptapDocToText(doc)).toBe('a\nb');
  });
});
```

**ポイント**：
- 入出力だけ見る
- 副作用なし、mock なし
- エッジケース（`null`, 空配列, 想定外の型）を網羅する

### パターン B：Server Actions の payload テスト（`actions.test.ts` 形式）

`fetch` をスタブし、実際に送信される JSON の形を検証する：

```ts
import type { Mock } from 'vitest';

vi.mock('@/lib/auth-utils', () => ({
  getRequiredSession: vi.fn(() =>
    Promise.resolve({ access_token: 'test-token' }),
  ),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { rewriteContent } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
  ));
});

it('payload はこの形になる', async () => {
  (createClient as Mock).mockResolvedValue(makeSupabaseMock({}));

  await rewriteContent('全文', '選択', '指示', null, {});

  const fetchMock = vi.mocked(fetch);
  const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);

  expect(body).toEqual({
    mode: 'rewrite',
    data: { /* ... */ },
  });
});
```

---

## 6. Supabase の mock ヘルパー

`actions.test.ts` 冒頭で定義している `createChainable` / `makeSupabaseMock` は、Supabase クライアントの **チェーン呼び出し**（`from().select().eq().order()...`）を再現するためのものです。

### しくみ

```ts
function createChainable(result: TableResult) {
  const chain = {
    select() { return chain; },
    eq() { return chain; },
    not() { return chain; },
    order() { return chain; },
    single() { return chain; },
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  return chain;
}
```

- 各メソッドが**自分自身を返す**ことでチェーン呼び出しを成立させる
- `then` を実装することで**thenable**となり、`await supabase.from('x').select()` の最後で `result` が解決される

### 使い方

```ts
(createClient as Mock).mockResolvedValue(
  makeSupabaseMock({
    characters: { data: [{ id: 'c1', name: 'Alice' }], error: null },
    plot_lists: { data: [/* ... */], error: null },
  }),
);
```

テーブル名 → 返したいレスポンスのマップを渡すだけ。指定がないテーブルへのアクセスは `{ data: [], error: null }` がデフォルトで返されます。

### 制限

- Supabase の SQL（`.select('*, plot_cards(*)')` の中身）が**正しく書けているかは検証できません**。あくまで「呼び出し方」と「返ってきたデータの整形ロジック」の検証用です。
- 新しいクエリメソッド（例：`.in()`, `.match()`）を実装側で使い始めたら、**`createChainable` にも同名メソッドを追加する必要があります**。

---

## 7. メンテナンス：いつテストを更新するか

### A. バックエンド API のリクエスト形式を変えた

**バックエンド側**：

1. `backend/src/schemas/` の Zod スキーマを変更
2. 必要なら API 実装を変更

**フロントエンド側**：

1. `app/novel/[slug]/edit/actions.ts` の payload 組み立てを修正
2. **必ず**`actions.test.ts` の `expect(...).toEqual(...)` を新しい形に更新
3. `npm run test:run` で全テスト pass を確認

> テストを更新しないと CI で落ちるので、**「フロントだけ直してテストを忘れる」事故は防げる**設計です。

### B. 新しい AI API エンドポイントを追加した

1. `actions.ts` に新しい関数を追加
2. `actions.test.ts` に対応する `describe(...)` ブロックを追加
3. 最低限以下のケースは書く：
   - 全フラグ true / 必須項目だけのケース
   - 全フラグ false / 任意項目省略のケース
   - 主要な分岐（`null` / `undefined` 周りの扱いなど）

### C. Supabase のテーブル構造やカラム名を変えた

1. `actions.ts` のクエリと整形ロジックを修正
2. `actions.test.ts` の mock データ（`makeSupabaseMock` の引数）を新しい構造に揃える
3. payload テストの期待値（`expect(...).toEqual(...)`）も合わせて修正

### D. Tiptap のスキーマや `pastContent` の整形仕様を変えた

1. `lib/tiptap-utils.ts` の実装を修正
2. `lib/tiptap-utils.test.ts` の該当ケースを更新／追加
3. 新しいノード種別をサポートしたなら、それに対応する `it(...)` を追加

### E. 新しい Supabase クエリメソッドを使い始めた

1. `actions.ts` で `.in()` や `.match()` 等を新規利用
2. `actions.test.ts` の `createChainable` にも同名メソッドを追加：

```ts
const chain = {
  select() { return chain; },
  eq() { return chain; },
  in() { return chain; },        // ← 追加
  // ...
};
```

---

## 8. このテストで「守れるもの」と「守れないもの」

### 守れるもの

- ✅ フロントの payload 組み立てロジックの**回帰**
- ✅ 引数の組み合わせ（フラグ on/off、`null` / `undefined`）による分岐の正しさ
- ✅ Tiptap doc → text 変換の各エッジケース
- ✅ `Promise.all` 並列実行で結果が正しく集約されているか（`fetchNovelReferences` の整形部分）

### 守れないもの

- ❌ Supabase の SQL 文が DB スキーマと一致しているか
- ❌ バックエンドの Zod スキーマが、送信した payload を**実際に**受け入れるか
- ❌ AI が生成する内容の品質
- ❌ `revalidatePath` が本当にキャッシュを破棄するか
- ❌ Supabase の認証 cookie 周りの挙動
- ❌ UI のクリック→保存→反映のユーザーフロー全体

これらを担保したい場合は **integration テスト** や **Playwright による E2E テスト**を別途検討してください。

---

## 9. 拡張アイデア（将来検討用）

### A. backend の Zod スキーマをフロントから import して契約テスト化

monorepo 構成なので可能。`backend/src/schemas/` から request 用のスキーマを import し、フロントが組み立てた payload を `parse()` して通ることを検証すれば、**バックエンド側の変更にフロントが追従できているか**を CI で機械的に検知できます。

```ts
import { rewriteRequestSchema } from '@/../backend/src/schemas/rewrite-request';

it('rewriteContent の payload は backend スキーマを満たす', async () => {
  await rewriteContent(/* ... */);
  const body = JSON.parse(/* ... */);
  expect(() => rewriteRequestSchema.parse(body.data)).not.toThrow();
});
```

### B. `fetchPlotListsForNovel` 等のシンプルな関数も追加でカバー

CRUD 系は ROI が低いとはいえ、**返却 shape の固定**だけなら数行で書けるので、不安なものから順に追加してもよい。

### C. テスト helper を共通ファイルに切り出し

テストファイルが 3 つ以上に増えたら、`createChainable` / `makeSupabaseMock` / `mockFetchOk` を `frontend/__tests__/helpers/` にまとめる。

---

## 10. トラブルシューティング

### `Cannot find name 'vi' / 'describe' / 'expect'`

`tsconfig.json` の `compilerOptions.types` に `"vitest/globals"` が含まれていることを確認してください。エディタを再起動すると解消することがあります。

### `vi.mock` がうまく効かない

ESM の hoisting の都合で、**`vi.mock` は import 文より上**に書く必要があります。今回のテストは以下の順序になっています：

```ts
import type { Mock } from 'vitest';   // 型 import は OK

vi.mock('@/lib/auth-utils', () => ({ /* ... */ }));   // ← import の前
vi.mock('next/cache',       () => ({ /* ... */ }));
vi.mock('@/lib/supabase/server', () => ({ /* ... */ }));

import { createClient } from '@/lib/supabase/server';   // ← mock の後
import { rewriteContent } from './actions';
```

### Supabase mock のチェーンメソッドが「is not a function」と言われる

実装側で新しいメソッド（例：`.in('status', [...])`）を使い始めた可能性があります。`createChainable` にそのメソッドを追加してください。

### `process.env.BACKEND_API_URL` が前のテストの値を引きずる

`beforeEach` で `delete process.env.BACKEND_API_URL` するか、`vi.unstubAllEnvs()` を使ってください。テストが互いに独立になるよう注意。

---

## 11. 参考リンク

- [Vitest 公式](https://vitest.dev/)
- [`vi.mock` の使い方](https://vitest.dev/api/vi.html#vi-mock)
- [`vi.stubGlobal`](https://vitest.dev/api/vi.html#vi-stubglobal)
- 関連ドキュメント：[api-payload-reference.md](./api-payload-reference.md)（バックエンド API の正しい payload 形式）

