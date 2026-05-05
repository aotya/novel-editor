# 直列 vs 並列リクエスト：Promise.all の使いどころ

## はじめに

複数の API やデータベースクエリを実行するとき、「直列（one by one）」で実行するか「並列（Promise.all）」で実行するかの選択は、パフォーマンスに大きく影響する。この記事では両者の違い、使い分けの基準、メリット・デメリットを整理する。

---

## 直列と並列の時間的な違い

```
【直列】
await A → await B → await C
─[A: 100ms]─[B: 80ms]─[C: 90ms]─
合計: 270ms

【並列】
await Promise.all([A, B, C])
─[A: 100ms]─
─[B:  80ms]─
─[C:  90ms]─
合計: 100ms（最も遅いリクエストが終わるまで）
```

ネットワークリクエストの大半は「送信して待つ」時間であるため、並列化すると **合計時間 = 最も遅いリクエスト1本分** になる。

---

## 直列にすべきケース

### 判断基準：後のリクエストが前の結果に依存している

```typescript
// ✅ 直列が正しい
// Step1: ユーザーを取得
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Step2: そのユーザーの所属チームを取得（user.team_id が必要）
const { data: team } = await supabase
  .from('teams')
  .select('*')
  .eq('id', user.team_id) // ← Step1 の結果を使っている
  .single();
```

前のリクエストの **レスポンスの値** を次のリクエストのパラメータに使う場合は、物理的に並列化できない。

### 直列が適切なその他のケース

- **トランザクション的な処理**：Step1 が成功したときだけ Step2 を実行したい
- **副作用の順序が重要**：レコードを INSERT してから、その ID で別テーブルを UPDATE する
- **デバッグを優先したい**：直列の方がエラー箇所を特定しやすい

---

## 並列にすべきケース

### 判断基準：リクエスト同士が互いに独立している

```typescript
// ✅ 並列が正しい
// novel_id（slug）は URL パラメータとして最初から判明しているため、
// 3つのクエリはどの順番で実行しても結果が変わらない

const [novelResult, chaptersResult, charactersResult] = await Promise.all([
  supabase.from('novels').select('*').eq('id', slug).single(),
  supabase.from('chapters').select('*', { count: 'exact', head: true }).eq('novel_id', slug),
  supabase.from('characters').select('*', { count: 'exact', head: true }).eq('novel_id', slug),
]);
```

「どちらが先に終わっても構わない」「互いの結果を使わない」ならば並列化できる。

---

## メリット・デメリット比較

|  | 直列 | 並列（Promise.all） |
|--|------|---------------------|
| **レスポンス速度** | 遅い（合計時間 = 全リクエストの合算） | 速い（合計時間 = 最も遅いリクエスト1本分） |
| **依存関係がある場合** | 対応可能 | 対応不可（設計の見直しが必要） |
| **エラーハンドリング** | 各ステップで個別に対処しやすい | 1つでも失敗すると全体がrejectされる* |
| **コードの読みやすさ** | 上から順に読めてわかりやすい | 慣れるまでやや読みにくい |
| **DB/API への負荷** | リクエストが分散される | 同時に複数投げるため瞬間的な負荷がある |

> *`Promise.all` は1つでも reject するとすぐに全体が失敗する（fail-fast）。各リクエストが失敗しても個別に処理したい場合は `Promise.allSettled` を使う。

---

## Promise.allSettled との使い分け

```typescript
// Promise.all：1つでも失敗したら即終了（fail-fast）
// → 「全部成功しないと意味がない」ときに使う
const [novel, chapters] = await Promise.all([
  supabase.from('novels').select('*').eq('id', slug).single(),
  supabase.from('chapters').select('*').eq('novel_id', slug),
]);

// Promise.allSettled：全部の結果を待ってから、成功/失敗を個別に判定
// → 「一部失敗してもできる範囲で表示したい」ときに使う
const results = await Promise.allSettled([
  fetchRecommendations(), // 失敗しても本体は表示したい
  fetchRelatedPosts(),    // 失敗しても本体は表示したい
]);
results.forEach(result => {
  if (result.status === 'fulfilled') {
    console.log(result.value);
  } else {
    console.error(result.reason);
  }
});
```

---

## 意思決定フローチャート

```
複数のリクエストを実行する
        │
        ▼
後のリクエストが前の結果に依存する？
    │               │
   Yes              No
    │               │
    ▼               ▼
  直列         全部失敗したら処理を止めたい？
            │               │
           Yes              No
            │               │
            ▼               ▼
        Promise.all   Promise.allSettled
```

---

## 実際のコードで考える：よくある間違い

### ❌ 実は依存関係がないのに直列にしている

```typescript
// NG: slug は最初から分かっているのに直列にしている
const novel = await supabase.from('novels').eq('id', slug).single();
const chapters = await supabase.from('chapters').eq('novel_id', slug); // slug を使っているだけ
const characters = await supabase.from('characters').eq('novel_id', slug);
```

### ✅ 並列にリファクタリング

```typescript
// OK: 全て slug（最初から判明）を使うだけなので並列でよい
const [novelResult, chaptersResult, charactersResult] = await Promise.all([
  supabase.from('novels').eq('id', slug).single(),
  supabase.from('chapters').eq('novel_id', slug),
  supabase.from('characters').eq('novel_id', slug),
]);
```

---

## まとめ

| 使う状況 | 手法 |
|----------|------|
| 後のリクエストが前の結果を使う | 直列（await を順番に） |
| 互いに独立していて、全部成功が必要 | `Promise.all` |
| 互いに独立していて、一部失敗を許容したい | `Promise.allSettled` |

「並列にできるのに直列にしている」コードは非常によくある。リクエストを書くたびに「これは前の結果が必要か？」を自問する習慣をつけると、自然とパフォーマンスの良いコードになる。
