import "./pretext-shim.ts";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";

/** 与 `renderSvgLabelBlock` 中 SVG 字体一致，避免测量与渲染脱节。 */
function vertexCanvasFont(fontSizePx: number): string {
  return `${fontSizePx}px Arial, Helvetica, sans-serif`;
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
