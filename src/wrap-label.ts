import "./pretext-shim.ts";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";

/** 与 `renderSvgLabelBlock` 中 SVG 字体一致，避免测量与渲染脱节。 */
function vertexCanvasFont(fontSizePx: number): string {
  return `${fontSizePx}px Arial, Helvetica, sans-serif`;
}

/**
 * 测量即将渲染的顶点标签占位（与 `wrapVertexLabelToBoxWidth` + `renderSvgLabelBlock` 一致）。
 * `softWrap=false` 时仅按硬换行折行，不按框宽软折行。
 */
export function measureVertexLabelDisplayBlock(
  displayText: string,
  boxWidthPx: number,
  fontSizePx: number,
  horizontalInsetPx: number,
  softWrap: boolean,
): { width: number; height: number } {
  const maxContent = Math.max(1, boxWidthPx - 2 * horizontalInsetPx);
  const lineHeight = fontSizePx * 1.2;
  const prepared = prepareWithSegments(displayText, vertexCanvasFont(fontSizePx), { whiteSpace: "pre-wrap" });
  const layoutMaxWidth = softWrap ? maxContent : 1e9;
  const { lines, height } = layoutWithLines(prepared, layoutMaxWidth, lineHeight);
  const maxLineW = lines.length === 0 ? 0 : Math.max(...lines.map((l) => l.width));
  return { width: maxLineW, height };
}

/**
 * 在顶点框宽内折行：`whiteSpace=wrap` 时使用 Pretext + Canvas 测量（经 `pretext-shim`）。
 * 保留 `\\n` 硬断行（`pre-wrap`）。
 */
export function wrapVertexLabelToBoxWidth(
  label: string,
  boxWidthPx: number,
  fontSizePx: number,
  horizontalInsetPx: number,
): string {
  const maxW = Math.max(1, boxWidthPx - 2 * horizontalInsetPx);
  const lineHeight = fontSizePx * 1.2;
  const prepared = prepareWithSegments(label, vertexCanvasFont(fontSizePx), { whiteSpace: "pre-wrap" });
  const { lines } = layoutWithLines(prepared, maxW, lineHeight);
  return lines.map((l) => l.text).join("\n");
}
