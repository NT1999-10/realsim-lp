# CODEX_SPEC — ガイド記事ページのテンプレートと1本目の生成

## 目的

LPと同じドメインに、ガイド記事のページを置く。記事の中身はMarkdownで `guide/_src/` にあり、変換スクリプトもすでにある。このPRでは、変換に必要な **テンプレート・CSS・30秒診断ウィジェットの部品** を作り、1本目の記事HTMLを生成する。

## すでにリポジトリにあるもの（変更しない）

| ファイル | 内容 |
|---|---|
| `guide/_src/calculation-logic.md` | 1本目の記事 |
| `guide/_src/build.mjs` | 変換スクリプト。`guide/_src/*.md` と `guide/_src/template.html` から `guide/<slug>.html` を作る |
| `.vercelignore` | `guide/_src` と `CODEX_SPEC_*.md` を配信対象から外している |
| `index.html` | LP本体。ヘッダー・フッター・CSS・ウィジェットのコピー元として**読むだけ** |

`build.mjs` の先頭コメントに、対応している記法とプレースホルダの仕組みが書いてある。実行は `node guide/_src/build.mjs`（リポジトリ直下で）。`package.json` は作らない。

## 範囲

**次の4ファイルの新規作成だけを行う。** 既存ファイルは1文字も変更しない。

1. `guide/_src/template.html`
2. `guide/_src/partials/shindan.html`
3. `guide/assets/guide.css`
4. `guide/calculation-logic.html`（`node guide/_src/build.mjs` の出力をそのままコミットする。手で編集しない）

記事一覧ページ、サイトマップ、`robots.txt`、LPからのリンク追加、OGP画像は、このPRではやらない。

スクリーンショットは不要です。ブラウザでの画面確認も不要です。

---

## 1. `guide/_src/template.html`

`build.mjs` が次のプレースホルダを置き換える。**これ以外の `{{…}}` を書くとエラーになる。**

| プレースホルダ | 中身 |
|---|---|
| `{{title}}` | 記事タイトル（エスケープ済み） |
| `{{description}}` | 記事の説明文（エスケープ済み） |
| `{{spec_version}}` | 例：2026年9月版 |
| `{{updated}}` | 例：2026-09-11 |
| `{{url}}` | 例：https://realsim-lp.vercel.app/guide/calculation-logic.html |
| `{{toc}}` | 目次の `<ol>`（h2へのリンク） |
| `{{content}}` | 本文HTML（h1は含まない） |

### head

- `<!doctype html>`、`<html lang="ja">`、`<meta charset="utf-8">`、viewport は `index.html` と同じ
- `<title>{{title}} — YOMU</title>`
- `<meta name="description" content="{{description}}">`
- `<link rel="canonical" href="{{url}}">`
- `<meta property="og:title" content="{{title}}">`、`og:description` は `{{description}}`、`<meta property="og:type" content="article">`、`og:url` は `{{url}}`、`<meta property="og:site_name" content="YOMU">`
- `<meta name="twitter:card" content="summary">`
- Google Fonts の preconnect 2行と stylesheet 1行、favicon 4行、`theme-color` は `index.html` の head からそのまま複製
- `<link rel="stylesheet" href="/guide/assets/guide.css">`

### body の構成（上から順に）

1. **SVGスプライト**：`index.html` 351行目からの非表示 `<svg width="0" height="0" …>` を、`<symbol id="i-alert">` と `<symbol id="i-arrow">` の2つだけを含む形で複製する（ウィジェットが使う）
2. **ヘッダー**：`index.html` の `<header>…</header>`（429〜445行）を複製し、次だけ変える
   - ロゴの `href="#top"` → `href="/"`
   - ナビの7つのリンク `#yomu` `#diag` `#why` `#features` `#engine` `#price` `#faq` → それぞれ先頭に `/` を付ける（例：`href="/#engine"`）
   - 「無料ではじめる」ボタンはそのまま
3. **記事**：`<main class="g-main">` の中に
   - `<header class="g-head">`：上に小さな英字ラベル `GUIDE`、`<h1>{{title}}</h1>`、その下にメタ行 `計算仕様 {{spec_version}} ／ 更新 {{updated}}`
   - `<nav class="g-toc" aria-label="目次">`：見出し「目次」と `{{toc}}`
   - `<article class="g-body">{{content}}</article>`
   - `<aside class="g-cta">`：見出し「自分の物件で、35年分を計算する」、本文「この記事と同じ計算を、あなたの物件の数字で。Freeプランは無料、クレジットカードの登録は不要です。」、ボタン `<a class="btn btn-g" href="https://realsim-app.vercel.app">無料ではじめる</a>`
4. **フッター**：`index.html` の `<footer>…</footer>`（879〜894行）をそのまま複製

`/guide/` などの**存在しないページへのリンクを置かない**。パンくずリストは作らない。HTMLコメント（`<!-- -->`）は書かない。

目次の見出し「目次」と、CTAの見出しには `<h1>`〜`<h3>` を使わない（`<p class="g-toc-title">` と `<p class="g-cta-title">` にする）。本文の見出しの数が完了条件の件数とずれるため。

## 2. `guide/_src/partials/shindan.html`

記事中の `<!-- widget: shindan -->` の位置に、`build.mjs` がこのファイルの中身を差し込む。

- `index.html` 570〜603行の `<div class="diag">…</div>` ブロックを複製する。変更は1点だけ：「フル版で35年を計算する」ボタンの `href="#price"` → `href="https://realsim-app.vercel.app"`
- その直後に `<script>` を置き、`index.html` 897〜923行（`(function(){` の次の行から `calc();` まで）を `(function(){ … })();` で包んで複製する。**925行目以降（reveal と カウンターの IntersectionObserver）は含めない**
- 計算式・文言・ID は変えない。HTMLコメントは書かない

## 3. `guide/assets/guide.css`

### 3-1. LPから複製する部分

- `index.html` の `:root{…}` をそのまま先頭に置く
- `index.html` の `<style>` から、ガイドページで使うクラスのルールを**値を変えずに**複製する：リセット・`body` の基本指定、`.wrap`、`header` と `.nav` `.brand` とナビ、`.btn` `.btn-p` `.btn-g`、`.ico` `.ico-box`（色違いを含む）、`.diag` 以下ウィジェット内の全クラス（`.diag-in` `.diag-out` `.field` `.box` `.unit` `.note` `.kv` `.assump` `.signal` `.lamp` `.txt` `.res` `.alert` など）、`footer` 以下のフッター内クラス。これらに関係する `@media` も含める
- ヒーロー、料金表などガイドで使わないセクションのCSSは複製しない

### 3-2. 記事用に新しく書く部分

世界観は「藍と山吹の方眼紙・帳簿」。**余白を取りすぎず、情報密度を保つ**。朱（`--red`）は記事用のスタイルでは使わない（ウィジェット内の既存の色は除く）。

| 対象 | 指定 |
|---|---|
| ページ背景 | `var(--paper)` に、藍の極薄い方眼（24pxグリッド、線は `rgba(30,62,107,.05)` 程度） |
| レイアウト | 幅1080px以上：左に目次（幅240px、`position:sticky`、上端はヘッダー64pxの下）、右に本文カード（最大幅760px）。1080px未満：目次は本文カードの上に通常配置 |
| 本文カード `.g-body` | 背景 `var(--surface)`、枠線 `1px solid var(--line)`、角丸 `var(--r)`、内側余白 PC 40px／スマホ 20px。方眼はカードの外だけに見える |
| `.g-head` | ラベル `GUIDE` は `var(--mono)` 12px・`var(--gold)`・字間広め。h1 は `var(--serif)` 700、PC 32px／スマホ 25px、行間1.45、`var(--ink-deep)`。メタ行は `var(--mono)` 13px・`var(--faint)` |
| h2 | `var(--serif)` 700、23px、`var(--ink-deep)`、上に `2px solid var(--ink)` の罫線、上余白 52px・下余白 14px、`scroll-margin-top: 84px` |
| h3 | `var(--sans)` 700、17.5px、`var(--ink)`、上余白 30px・下余白 10px、`scroll-margin-top: 84px` |
| 段落 | 16px、行間 1.9、`var(--text)`、下余白 16px |
| `strong` | 700、`var(--ink-deep)` |
| リンク | `var(--ink-2)`、下線 |
| `hr` | 本文内では表示しない（h2の罫線で区切るため） |
| `blockquote` | 背景 `var(--gold-soft)`、左に `4px solid var(--gold)`、角丸 `var(--r-xs)`、余白 12px 16px |
| `pre.formula` | 背景 `var(--surface-2)`、枠線 `1px solid var(--line-2)`、左に `4px solid var(--ink)`、角丸 `var(--r-xs)`、余白 14px 16px、`var(--mono)` 14px・行間 1.8・`var(--ink-deep)`、`white-space:pre`、横スクロール可 |
| `.table-wrap` | 横スクロール可、上下余白 16px/24px |
| `table` | 幅100%、`border-collapse:collapse`、14px。`th` は背景 `var(--surface-2)`・`var(--muted)`・700・左寄せ。`th` `td` は余白 8px 10px、下罫線 `1px solid var(--line)` |
| `th.num` `td.num` | 右寄せ、`var(--mono)`、`font-variant-numeric: tabular-nums`、折り返さない |
| `ol` `ul` | 左余白 1.5em、行間 1.8、項目間 6px |
| `.g-toc` | 背景 `var(--surface)`、枠線 `1px solid var(--line)`、角丸 `var(--r-s)`、余白 16px、14px。見出し「目次」は `var(--mono)` 12px・`var(--gold)`。リストは番号なし（見出し自体に番号があるため） |
| `.g-widget` | 上下余白 24px/32px |
| `.g-cta` | 背景 `var(--ink-deep)`、文字白、角丸 `var(--r)`、余白 28px、本文カードと同じ幅 |

## 4. `guide/calculation-logic.html`

1〜3を作ったら、リポジトリ直下で `node guide/_src/build.mjs` を実行し、出力されたファイルをコミットする。

---

## 完了条件（Codexが判定する）

### ビルド

- `node guide/_src/build.mjs` が終了コード0で終わる
- もう一度実行しても `guide/calculation-logic.html` の内容が変わらない（`git diff --exit-code guide/calculation-logic.html` がコミット後に成功）
- `test ! -e package.json` が成功する

### 変更範囲

- `git diff --stat main` に出るのは次の4ファイルだけ：`guide/_src/template.html`、`guide/_src/partials/shindan.html`、`guide/assets/guide.css`、`guide/calculation-logic.html`
- `git diff main -- index.html .vercelignore guide/_src/build.mjs guide/_src/calculation-logic.md` の出力が空

### 生成されたHTMLの中身

件数は `grep -oF "文字列" guide/calculation-logic.html | wc -l` で数える。

| 文字列 | 期待値 |
|---|---|
| `class="formula"` | 14 |
| `<table>` | 13 |
| `<h2 id=` | 15 |
| `<h1` | 1 |
| `id="dscr"` | 1 |
| `class="diag"` | 1 |
| `id="i_price"` | 1 |
| `var income=rent*0.96` | 1 |
| `IntersectionObserver` | 0 |
| `<symbol id="i-alert"` | 1 |
| `<symbol id="i-arrow"` | 1 |
| `{{` | 0 |
| `<!--` | 0 |
| `href="#price"` | 0 |
| `href="#top"` | 0 |
| `href="/#engine"` | 1 |
| `href="https://realsim-app.vercel.app"` | 3 |
| `<link rel="canonical" href="https://realsim-lp.vercel.app/guide/calculation-logic.html">` | 1 |
| `<meta property="og:type" content="article">` | 1 |
| `href="/guide/assets/guide.css"` | 1 |
| `17,351,793円` | 1 |

### CSS

| 文字列（`grep -oF … guide/assets/guide.css \| wc -l`） | 期待値 |
|---|---|
| `--ink:#1E3E6B` | 1 |
| `pre.formula` | 1以上 |
| `.table-wrap` | 1以上 |
| `.g-toc` | 1以上 |

## 人間がプレビューで確認すること（Codexは判定しない）

- `/guide/calculation-logic.html` が、LPと同じヘッダー・フッターで表示される
- PCで目次が左に固定され、クリックすると見出しがヘッダーに隠れずに表示される
- DSCRの節の30秒診断で、数字を変えると信号と結果がその場で変わる
- スマホ幅で、表と式が横スクロールでき、ページ全体が横にはみ出さない
- 余白が多すぎず、帳簿らしい密度に見える
- プレビューURLで `/guide/_src/calculation-logic.md` を開くと 404 になる
