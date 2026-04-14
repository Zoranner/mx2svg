import { decompressDiagramInner } from "./decompress.ts";

/** diagram 元素内嵌的压缩或纯文本 payload → 内层 XML 字符串。 */
export function diagramCompressedOrRawText(diagramEl: Record<string, unknown>): string | null {
  const text = diagramEl["#text"];
  if (typeof text === "string" && text.trim()) {
    return decompressDiagramInner(text);
  }
  return null;
}
