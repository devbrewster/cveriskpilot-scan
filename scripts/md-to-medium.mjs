#!/usr/bin/env node
/**
 * Markdown → Medium HTML Converter
 *
 * Converts a Markdown file into clean HTML optimized for pasting into Medium's editor.
 * Handles Medium's quirks: no table support, code block formatting, image embeds.
 *
 * Usage:
 *   node scripts/md-to-medium.mjs docs/blog/my-article.md
 *   node scripts/md-to-medium.mjs docs/blog/my-article.md --out out.html
 *   node scripts/md-to-medium.mjs docs/blog/my-article.md --clipboard  # copy to clipboard
 *   node scripts/md-to-medium.mjs docs/blog/my-article.md --open       # open in browser
 */

import { readFileSync, writeFileSync } from "fs";
import { basename, resolve, dirname } from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.error("Usage: node scripts/md-to-medium.mjs <file.md> [--out file.html] [--clipboard] [--open]");
  process.exit(1);
}

const inputPath = resolve(files[0]);
const md = readFileSync(inputPath, "utf8");

// --- Markdown parser (zero deps — handles what Medium needs) ---

function convertMarkdown(source) {
  let html = source;

  // Strip YAML frontmatter
  html = html.replace(/^---\n[\s\S]*?\n---\n/, "");

  // Step 1: Extract code blocks into placeholders (so nothing inside gets transformed)
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const escaped = escapeHtml(code.trimEnd());
    codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
    return `\n\n%%CODEBLOCK_${idx}%%\n\n`;
  });

  // Inline code — extract too so backtick content isn't transformed
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${code}</code>`);
    return `%%INLINE_${idx}%%`;
  });

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure><img src="$2" alt="$1"><figcaption>$1</figcaption></figure>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Headings (## → h3, # → h2 for Medium — h1 is reserved for title)
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");

  // Horizontal rules — Medium uses section breaks
  html = html.replace(/^---$/gm, "<hr>");

  // Blockquotes (handle multi-line, merge consecutive > lines into one block)
  html = html.replace(/^((?:>[ ]?.*\n?)+)/gm, (match) => {
    const lines = match.trim().split("\n");
    const content = lines
      .map((l) => l.replace(/^>\s?/, "").trim())
      .filter((l) => l.length > 0)
      .join("<br>");
    return `<blockquote>${content}</blockquote>`;
  });

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Unordered lists — match consecutive lines starting with "- "
  html = html.replace(/(^|\n)(- .+(\n- .+)*)/g, (match, prefix) => {
    const lines = match.trim().split("\n");
    const items = lines.map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("\n");
    return `${prefix}<ul>\n${items}\n</ul>`;
  });

  // Ordered lists — match consecutive lines starting with "N. "
  html = html.replace(/(^|\n)(\d+\. .+(\n\d+\. .+)*)/g, (match, prefix) => {
    const lines = match.trim().split("\n");
    const items = lines.map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("\n");
    return `${prefix}<ol>\n${items}\n</ol>`;
  });

  // Paragraphs — wrap remaining plain text blocks
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Skip blocks that are already HTML elements or placeholders
      if (/^(<h[2-4]|<pre|<ul|<ol|<blockquote|<figure|<hr|%%CODEBLOCK_)/.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n\n");

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`%%CODEBLOCK_${i}%%`, block);
  });

  // Restore inline code
  inlineCodes.forEach((code, i) => {
    html = html.replace(`%%INLINE_${i}%%`, code);
  });

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Convert ---

const body = convertMarkdown(md);

// Extract title from first h2
const titleMatch = body.match(/<h2>(.+?)<\/h2>/);
const title = titleMatch ? titleMatch[1] : basename(inputPath, ".md");

// Build full HTML document for preview/paste
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    /* Medium-like preview styling */
    body {
      max-width: 680px;
      margin: 40px auto;
      padding: 0 20px;
      font-family: charter, Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 21px;
      line-height: 1.58;
      color: #292929;
      background: #fff;
    }
    h2 { font-size: 34px; font-weight: 700; margin-top: 40px; }
    h3 { font-size: 26px; font-weight: 700; margin-top: 36px; }
    h4 { font-size: 22px; font-weight: 700; margin-top: 30px; }
    p { margin: 20px 0; }
    a { color: inherit; text-decoration: underline; }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: Menlo, Monaco, "Courier New", monospace;
      font-size: 16px;
    }
    pre {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 4px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
      font-size: 15px;
      line-height: 1.5;
    }
    blockquote {
      border-left: 3px solid #292929;
      padding-left: 20px;
      margin-left: 0;
      font-style: italic;
      color: #555;
    }
    ul, ol { padding-left: 30px; }
    li { margin: 8px 0; }
    hr {
      border: none;
      text-align: center;
      margin: 40px 0;
    }
    hr::before {
      content: "...";
      font-size: 28px;
      letter-spacing: 12px;
      color: #999;
    }
    figure { margin: 20px 0; text-align: center; }
    figure img { max-width: 100%; }
    figcaption { font-size: 14px; color: #999; margin-top: 8px; }
    .copy-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1a8917;
      color: white;
      text-align: center;
      padding: 12px;
      font-family: -apple-system, sans-serif;
      font-size: 14px;
      z-index: 100;
    }
    .copy-banner button {
      background: white;
      color: #1a8917;
      border: none;
      padding: 6px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 600;
      margin-left: 12px;
    }
    .content { margin-top: 60px; }
  </style>
</head>
<body>
  <div class="copy-banner">
    Medium-ready preview — Select All (Ctrl+A) then paste into Medium's editor
    <button onclick="selectContent()">Select Article</button>
  </div>
  <div class="content" id="article">
    ${body}
  </div>
  <script>
    function selectContent() {
      const el = document.getElementById('article');
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  </script>
</body>
</html>`;

// --- Output ---

const outFlagIdx = args.indexOf("--out");
const outPath =
  outFlagIdx >= 0 && args[outFlagIdx + 1]
    ? resolve(args[outFlagIdx + 1])
    : resolve(dirname(inputPath), basename(inputPath, ".md") + ".medium.html");

writeFileSync(outPath, fullHtml);
console.log(`✓ Converted: ${inputPath}`);
console.log(`✓ Output:    ${outPath}`);

// Word count
const wordCount = md
  .replace(/```[\s\S]*?```/g, "")
  .replace(/[#*\-|`>]/g, "")
  .split(/\s+/)
  .filter(Boolean).length;
console.log(`✓ Words:     ~${wordCount} (Medium sweet spot: 800-1,200)`);

// Clipboard
if (flags.has("--clipboard")) {
  try {
    execSync("which xclip", { stdio: "ignore" });
    execSync(`echo ${JSON.stringify(body)} | xclip -selection clipboard -t text/html`);
    console.log("✓ Copied HTML to clipboard — paste directly into Medium");
  } catch {
    console.log("⚠ xclip not found — install with: sudo apt install xclip");
  }
}

// Open in browser
if (flags.has("--open")) {
  try {
    execSync(`xdg-open "${outPath}" 2>/dev/null || open "${outPath}" 2>/dev/null || start "${outPath}" 2>/dev/null`, {
      stdio: "ignore",
    });
    console.log("✓ Opened in browser");
  } catch {
    console.log(`⚠ Could not open browser — open manually: ${outPath}`);
  }
}
