/** draw.io 边标签 `align` / `verticalAlign`（style 键为小写 `align`、`verticalalign`）。 */

export type EdgeLabelAlignH = "left" | "center" | "right";
export type EdgeLabelAlignV = "top" | "middle" | "bottom";

export function parseEdgeLabelAlignH(style: Map<string, string>): EdgeLabelAlignH {
  const raw = (style.get("align") ?? "center").toLowerCase().trim();
  if (raw === "left") return "left";
  if (raw === "right") return "right";
  return "center";
}

export function parseEdgeLabelAlignV(style: Map<string, string>): EdgeLabelAlignV {
  const raw = (style.get("verticalalign") ?? "middle").toLowerCase().trim();
  if (raw === "top") return "top";
  if (raw === "bottom") return "bottom";
  return "middle";
}

/** 与测宽 `tw` 及块中心 `tcx` 配合，映射为 SVG `text-anchor`。 */
export function edgeLabelSvgTextAnchor(ah: EdgeLabelAlignH): "start" | "middle" | "end" {
  if (ah === "left") return "start";
  if (ah === "right") return "end";
  return "middle";
}

/**
 * 锚点（路径上的几何点）与标签内容包围盒 tw×th：根据对齐方式得到**内容块中心**，
 * 用于 `text-anchor="middle"` 下单行/多行栈的几何中心。
 */
export function edgeLabelContentCenter(
  anchor: { x: number; y: number },
  tw: number,
  th: number,
  ah: EdgeLabelAlignH,
  av: EdgeLabelAlignV,
): { x: number; y: number } {
  let x = anchor.x;
  let y = anchor.y;
  if (ah === "left") x = anchor.x + tw / 2;
  else if (ah === "right") x = anchor.x - tw / 2;
  if (av === "top") y = anchor.y + th / 2;
  else if (av === "bottom") y = anchor.y - th / 2;
  return { x, y };
}

/** 有衬底时：锚点对应盒的某一角/边，返回轴对齐衬底矩形与内嵌文字中心（衬底内居中）。 */
export function edgeLabelBackgroundLayout(
  anchor: { x: number; y: number },
  tw: number,
  th: number,
  pad: number,
  ah: EdgeLabelAlignH,
  av: EdgeLabelAlignV,
): { bx: number; by: number; bw: number; bh: number; tcx: number; tcy: number } {
  const bw = tw + pad * 2;
  const bh = th + pad * 2;
  let bx = anchor.x;
  let by = anchor.y;
  if (ah === "center") bx = anchor.x - bw / 2;
  else if (ah === "right") bx = anchor.x - bw;
  if (av === "middle") by = anchor.y - bh / 2;
  else if (av === "bottom") by = anchor.y - bh;
  const tcx = bx + bw / 2;
  const tcy = by + bh / 2;
  return { bx, by, bw, bh, tcx, tcy };
}
