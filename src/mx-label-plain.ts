/**
 * draw.io 顶点/边 `value` 常为 HTML 片段；SVG 暂用单行 `<text>`，统一降级为纯文本。
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

/** 去掉 HTML/XML 注释与标签，折叠空白（含换行），供居中单行文本使用。 */
export function mxLabelToPlainText(raw: string): string {
  if (!raw) return "";
  let t = decodeMxEntitiesAndBreaks(raw);
  t = t.replace(/<!--[\s\S]*?-->/g, "");
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}
