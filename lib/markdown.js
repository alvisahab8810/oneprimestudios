// lib/markdown.js — small Markdown-to-HTML converter for blog posts (client and server safe).
// Supports headings (with ids for the table of contents), bold, italic, inline code,
// links, images, blockquotes, bullet and numbered lists, and raw HTML blocks.
// Content comes only from admins, so raw HTML is passed through on purpose.

export function headingId(text) {
  return stripMd(String(text || ""))
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function stripMd(text) {
  return String(text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/(^|\W)_(\S[^_]*?)_(?=\W|$)/g, "$1$2")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1");
}

const attr = (v) => String(v).replace(/"/g, "&quot;");

function inline(text, save) {
  let s = text;
  s = s.replace(/`([^`]+)`/g, (_, c) => save(`<code>${c.replace(/</g, "&lt;")}</code>`));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
    save(`<img src="${attr(src)}" alt="${attr(alt)}" loading="lazy" />`)
  );
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const internal = href.startsWith("/") || href.startsWith("#");
    const extra = internal ? "" : ' target="_blank" rel="noopener noreferrer"';
    return save(`<a href="${attr(href)}"${extra}>${inline(label, save)}</a>`);
  });
  s = s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/(^|\W)_(\S[^_]*?)_(?=\W|$)/g, "$1<em>$2</em>");
  return s;
}

export function mdToHtml(md) {
  if (!md) return "";
  const stash = [];
  const save = (html) => {
    stash.push(html);
    return `\u0002${stash.length - 1}\u0003`;
  };

  let s = String(md).replace(/\r\n/g, "\n");
  // Keep raw HTML blocks untouched
  s = s.replace(/<([a-zA-Z][\w-]*)[^>]*>[\s\S]*?<\/\1>|<[a-zA-Z][^>]*\/>/g, save);

  const lines = s.split("\n");
  const out = [];
  let para = [];
  let list = null; // { tag, items }

  const flushPara = () => {
    if (para.length) {
      const text = para.join(" ").trim();
      if (text) {
        const only = /^\u0002\d+\u0003$/.test(text);
        out.push(only ? text : `<p>${inline(text, save)}</p>`);
      }
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i, save)}</li>`).join("")}</${list.tag}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const h = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    const ul = /^\s*[-*+]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    const bq = /^>\s?(.*)$/.exec(line);

    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (h) {
      flushPara();
      flushList();
      const level = h[1].length;
      out.push(`<h${level} id="${headingId(h[2])}">${inline(h[2], save)}</h${level}>`);
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushPara();
      flushList();
      out.push("<hr />");
    } else if (ul || ol) {
      flushPara();
      const tag = ul ? "ul" : "ol";
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push((ul || ol)[1]);
    } else if (bq) {
      flushPara();
      flushList();
      out.push(`<blockquote>${inline(bq[1], save)}</blockquote>`);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  let html = out.join("\n");
  // Restore stashed pieces (they can nest, so repeat)
  for (let i = 0; i < 5 && /\u0002\d+\u0003/.test(html); i++) {
    html = html.replace(/\u0002(\d+)\u0003/g, (_, n) => stash[+n]);
  }
  return html;
}

export function extractToc(md) {
  if (!md) return [];
  const toc = [];
  for (const line of String(md).replace(/\r\n/g, "\n").split("\n")) {
    const m = /^(#{2,4})\s+(.+?)\s*#*$/.exec(line);
    if (m) toc.push({ level: m[1].length, text: stripMd(m[2]), id: headingId(m[2]) });
  }
  return toc;
}

export function readTime(content) {
  if (!content) return "1 min read";
  const words = String(content).trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

export function countWords(content) {
  const t = String(content || "").trim();
  return t ? t.split(/\s+/).length : 0;
}
