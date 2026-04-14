/**
 * 边箭头：`endArrow` / `startArrow` 常见取值 → SVG marker。
 */

export type ArrowHeadKind = "none" | "filled" | "open" | "oval" | "diamond";

function mapArrowToken(v: string): ArrowHeadKind {
  const t = v.toLowerCase().trim();
  if (t === "none" || t === "") return "none";
  if (t === "open" || t === "openthin" || t === "openasync") return "open";
  if (t === "oval" || t === "dot") return "oval";
  if (t === "diamond" || t === "diamondthin") return "diamond";
  return "filled";
}

/** 终点箭头（缺省 `classic` → 实心三角）。 */
export function parseEndArrow(style: Map<string, string>): ArrowHeadKind {
  const raw = style.get("endarrow") ?? "classic";
  return mapArrowToken(raw);
}

/** 起点箭头（未设置 `startArrow` → 无）。 */
export function parseStartArrow(style: Map<string, string>): ArrowHeadKind {
  const raw = style.get("startarrow");
  if (raw === undefined) return "none";
  return mapArrowToken(raw);
}

export function markerEndAttr(kind: ArrowHeadKind): string {
  if (kind === "none") return "";
  const id =
    kind === "filled"
      ? "mx2svg-arrow-end"
      : kind === "open"
        ? "mx2svg-arrow-open-end"
        : kind === "oval"
          ? "mx2svg-arrow-oval-end"
          : "mx2svg-arrow-diamond-end";
  return ` marker-end="url(#${id})"`;
}

export function markerStartAttr(kind: ArrowHeadKind): string {
  if (kind === "none") return "";
  const id =
    kind === "filled"
      ? "mx2svg-arrow-start"
      : kind === "open"
        ? "mx2svg-arrow-open-start"
        : kind === "oval"
          ? "mx2svg-arrow-oval-start"
          : "mx2svg-arrow-diamond-start";
  return ` marker-start="url(#${id})"`;
}

/** 所有箭头 marker 定义（一次性放入 `<defs>`）。 */
export const ARROW_MARKER_DEFS = `<marker id="mx2svg-arrow-end" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="#333333"/>
</marker>
<marker id="mx2svg-arrow-start" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 10 0 L 0 5 L 10 10 z" fill="#333333"/>
</marker>
<marker id="mx2svg-arrow-open-end" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 1 1 L 11 6 L 1 11" fill="none" stroke="#333333" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
</marker>
<marker id="mx2svg-arrow-open-start" markerWidth="12" markerHeight="12" refX="1" refY="6" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 11 1 L 1 6 L 11 11" fill="none" stroke="#333333" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
</marker>
<marker id="mx2svg-arrow-oval-end" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
  <ellipse cx="5" cy="5" rx="4" ry="4" fill="#333333"/>
</marker>
<marker id="mx2svg-arrow-oval-start" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto" markerUnits="userSpaceOnUse">
  <ellipse cx="5" cy="5" rx="4" ry="4" fill="#333333"/>
</marker>
<marker id="mx2svg-arrow-diamond-end" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 1 6 L 6 1 L 11 6 L 6 11 Z" fill="#333333"/>
</marker>
<marker id="mx2svg-arrow-diamond-start" markerWidth="12" markerHeight="12" refX="1" refY="6" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 11 6 L 6 1 L 1 6 L 6 11 Z" fill="#333333"/>
</marker>`;
