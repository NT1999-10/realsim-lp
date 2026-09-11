# CODEX_SPEC — デッドクロス機能に合わせて記事とLPを更新する

## 目的

アプリ（realsim-app PR#20）にデッドクロスの判定と表示が入った。これに合わせて、次の2つを更新する。

- 記事1本目：原稿 `guide/_src/calculation-logic.md` はすでに更新済みでmainにある。HTMLを再生成するだけ
- LP：デッドクロスの記述を2箇所、実装どおりの表現で入れる

## 範囲

**次の2つだけを行う。**

1. リポジトリ直下で `node guide/_src/build.mjs` を実行し、生成された `guide/calculation-logic.html` をコミットする（手で編集しない）
2. `index.html` の2箇所の文字列置換

`guide/_src/` 以下のファイル、`guide/assets/guide.css`、その他のファイルは変更しない。

スクリーンショットは不要です。ブラウザでの画面確認も不要です。

## 作業の前に確認すること

原稿がアップロードどおりの内容かを確かめる。一致しない場合は作業せずに停止し、その旨を報告する。

```bash
sha256sum guide/_src/calculation-logic.md
```

期待値：`436f983429782e835e83576d2c02d4ec556d94d07693b6f956a19ad195cb31dc`

## `index.html` の置換

各「変更前」は `index.html` 内にちょうど1回だけ出現する。

### 1. 機能「MORTGAGE」の本文

変更前:

```html
毎年、その年の金利で返済額を引き直します。</p>
```

変更後:

```html
毎年、その年の金利で返済額を引き直します。償却が切れて税が増える「デッドクロス」も判定します。</p>
```

### 2. 比較表「所得税・住民税／デッドクロス」の行

変更前:

```html
限界税率で税引後CF。償却が切れた年からの税負担増も反映
```

変更後:

```html
限界税率で税引後CF。償却が切れる年と増える税額を表示し、大きければ警告
```

## 完了条件（Codexが判定する）

| 確認 | 期待値 |
|---|---|
| `sha256sum guide/calculation-logic.html` | `a50e24d82fbd9766fdf77f335ee469a8e1c867b06ca557df67e79b2c8ccf98d0` |
| もう一度 `node guide/_src/build.mjs` を実行した後の `sha256sum guide/calculation-logic.html` | 上と同じ |
| `git diff --stat main` に出るファイル | `guide/calculation-logic.html` と `index.html` の2つだけ |
| `git diff --numstat main -- index.html` | 追加 2、削除 2 |
| `grep -oF "デッドクロス" index.html \| wc -l` | 3 |
| `grep -oF "大きければ警告" index.html \| wc -l` | 1 |
| `grep -oF "税負担増も反映" index.html \| wc -l` | 0 |
| `grep -oF 'id="dead-cross"' guide/calculation-logic.html \| wc -l` | 1 |
| `grep -oF 'class="formula"' guide/calculation-logic.html \| wc -l` | 15 |
| `grep -oF '<table>' guide/calculation-logic.html \| wc -l` | 14 |

## 人間がプレビューで確認すること（Codexは判定しない）

- 記事の6節に「デッドクロス」の新しい説明と、4年目・5年目の表が出ている
- 9節「その他の指標」と11節の黄の表に、デッドクロスの行が増えている
- 6節の「11節」、9節・11節の「6節」のリンクが正しい見出しに飛ぶ
- LPの「MORTGAGE」の説明と、比較表の税の行が新しい文言になっている
