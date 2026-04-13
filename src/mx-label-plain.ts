/**
 * draw.io 顶点/边 `value` 常为 HTML 片段；降级为纯文本，显式换行保留为 `\n`（供 SVG `<tspan>` 多行居中）。
 */

function decodeMxEntitiesAndBreaks(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&#xa0;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&#xa;/gi, "\n")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
}

/**
 * 去掉标签与注释；`</p>`、`</div>`、`</tr>`、`<br>` 等产生换行；行内空白折叠；空行丢弃；多行以 `\n` 连接。
 */
export function mxLabelToPlainText(raw: string): string {
  if (!raw) return "";
  let t = decodeMxEntitiesAndBreaks(raw);
  t = t.replace(/<!--[\s\S]*?-->/g, "");
  t = t.replace(/<\/p>/gi, "\n");
  t = t.replace(/<\/div>/gi, "\n");
  t = t.replace(/<\/tr>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  const lines = t
    .split(/\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
  return lines.join("\n");
}
