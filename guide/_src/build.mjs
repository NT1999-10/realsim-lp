// ガイド記事ビルド: guide/_src/*.md → guide/<slug>.html
// 使い方: リポジトリ直下で `node guide/_src/build.mjs`
// 依存パッケージなし（node: 組み込みモジュールのみ）。出力は決定的（何度実行しても同じ）。
//
// 対応している記法（ガイド記事で使うものだけ）
//   先頭の front matter（key: value）/ # 見出し（h1はtitleと一致を確認して本文から除く）
//   ## / ### 見出しと末尾の {#id} / 段落 / **太字** / [文字](URL)
//   | 表 |（2行目の ---: で右寄せ）/ ```formula 式ブロック / 1. 番号リスト / - 箇条書き
//   > 引用 / --- 区切り線 / <!-- widget: 名前 --> ウィジェット差し込み / その他の <!-- --> は削除

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(fileURLToPath(import.meta.url));
const OUT = join(SRC, "..");
const SITE = "https://realsim-lp.vercel.app";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(text) {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const ext = /^https?:\/\//.test(href);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
  });
  return s;
}

function heading(line) {
  const m = line.match(/^(#{1,3})\s+(.*?)(?:\s+\{#([a-z0-9-]+)\})?\s*$/);
  return { level: m[1].length, text: m[2], id: m[3] || null };
}

function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function convert(md, name) {
  // front matter
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) throw new Error(`${name}: front matter がありません`);
  const meta = {};
  for (const l of fm[1].split("\n")) {
    const m = l.match(/^([a-z_]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2];
  }
  for (const k of ["title", "slug", "description", "spec_version", "updated"]) {
    if (!meta[k]) throw new Error(`${name}: front matter に ${k} がありません`);
  }
  let body = md.slice(fm[0].length);

  // ウィジェット差し込み（行単位）→ 残りのコメントを削除
  const widgets = [];
  body = body.replace(/^<!--\s*widget:\s*([a-z0-9-]+)\s*-->\s*$/gm, (_, w) => {
    widgets.push(w);
    return `\u0000WIDGET:${w}\u0000`;
  });
  body = body.replace(/<!--[\s\S]*?-->\n?/g, "");

  const lines = body.split("\n");
  const html = [];
  const toc = [];
  let i = 0;
  let sawH1 = false;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    const wm = line.match(/^\u0000WIDGET:([a-z0-9-]+)\u0000$/);
    if (wm) {
      const p = join(SRC, "partials", `${wm[1]}.html`);
      if (!existsSync(p)) throw new Error(`${name}: partials/${wm[1]}.html がありません`);
      html.push(`<div class="g-widget" data-widget="${wm[1]}">\n${readFileSync(p, "utf8").trim()}\n</div>`);
      i++; continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      if (lang !== "formula") throw new Error(`${name}: 未対応のコードブロック ${lang}`);
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      if (i >= lines.length) throw new Error(`${name}: 式ブロックが閉じていません`);
      i++;
      html.push(`<pre class="formula"><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const h = heading(line);
      if (h.level === 1) {
        if (h.text !== meta.title) throw new Error(`${name}: h1 と title が一致しません`);
        sawH1 = true; i++; continue;
      }
      const idAttr = h.id ? ` id="${h.id}"` : "";
      html.push(`<h${h.level}${idAttr}>${inline(h.text)}</h${h.level}>`);
      if (h.level === 2) {
        if (!h.id) throw new Error(`${name}: h2 に {#id} がありません: ${h.text}`);
        toc.push(`<li><a href="#${h.id}">${inline(h.text)}</a></li>`);
      }
      i++; continue;
    }

    if (line.trim() === "---") { html.push("<hr>"); i++; continue; }

    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const head = splitRow(rows[0]);
      const aligns = splitRow(rows[1]).map((c) => (/^:?-+:$/.test(c) && !/^:-+:$/.test(c) ? "num" : ""));
      const cls = (j) => (aligns[j] ? ` class="${aligns[j]}"` : "");
      const thead = `<thead><tr>${head.map((c, j) => `<th${cls(j)}>${inline(c)}</th>`).join("")}</tr></thead>`;
      const tbody = rows.slice(2).map((r) =>
        `<tr>${splitRow(r).map((c, j) => `<td${cls(j)}>${inline(c)}</td>`).join("")}</tr>`).join("\n");
      html.push(`<div class="table-wrap"><table>\n${thead}\n<tbody>\n${tbody}\n</tbody>\n</table></div>`);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, ""));
      html.push(`<ol>\n${items.map((t) => `<li>${inline(t)}</li>`).join("\n")}\n</ol>`);
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      html.push(`<ul>\n${items.map((t) => `<li>${inline(t)}</li>`).join("\n")}\n</ul>`);
      continue;
    }

    if (line.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      html.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }

    const buf = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,3}\s|```|\||- |\d+\.\s|>|---$|\u0000WIDGET)/.test(lines[i])) {
      buf.push(lines[i++]);
    }
    if (buf.length === 0) throw new Error(`${name}: 解釈できない行: ${line}`);
    html.push(`<p>${inline(buf.join(""))}</p>`);
  }

  if (!sawH1) throw new Error(`${name}: h1 がありません`);
  if (new Set(widgets).size !== widgets.length) throw new Error(`${name}: 同じウィジェットは1記事に1つまで`);
  return { meta, content: html.join("\n\n"), toc: `<ol>\n${toc.join("\n")}\n</ol>` };
}

const template = readFileSync(join(SRC, "template.html"), "utf8");
const files = readdirSync(SRC).filter((f) => f.endsWith(".md")).sort();
if (files.length === 0) throw new Error("guide/_src に .md がありません");

for (const f of files) {
  const { meta, content, toc } = convert(readFileSync(join(SRC, f), "utf8"), f);
  if (`${meta.slug}.md` !== f) throw new Error(`${f}: slug とファイル名が一致しません`);
  const values = {
    title: esc(meta.title),
    description: esc(meta.description),
    spec_version: esc(meta.spec_version),
    updated: esc(meta.updated),
    url: `${SITE}/guide/${meta.slug}.html`,
    toc,
    content,
  };
  let page = template.replace(/\{\{([a-z_]+)\}\}/g, (m, k) => {
    if (!(k in values)) throw new Error(`template.html: 未知のプレースホルダ ${m}`);
    return values[k];
  });
  writeFileSync(join(OUT, `${meta.slug}.html`), page);
  console.log(`built guide/${meta.slug}.html`);
}
