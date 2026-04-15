/**
 * 边箭头：`endArrow` / `startArrow` 常见取值 → SVG marker（颜色与边 `strokeColor` 一致）。
 */

import type { DiagramEdge } from "../core/model.ts";

export type ArrowHeadKind =
  | "none"
  | "filled"
  | "open"
  | "oval"
  | "diamond"
  | "dash"
  /** 双实心三角（draw.io `doubleBlock`）。 */
  | "doubleBlock";

/**
 * 与 draw.io `mxMarker` 注册名对齐（参见 `mxgraph/src/shape/mxMarker.js`）。
 * `classicThin` / `blockThin` / `openThin` 等仍映射到同类箭头，尺寸由 {@link edgeArrowSizeScale} 按 **thin** 缩小。
 */
function mapArrowToken(v: string): ArrowHeadKind {
  const t = v.toLowerCase().trim();
  if (t === "none" || t === "") return "none";
  if (t === "open" || t === "openthin" || t === "openasync" || t === "async") return "open";
  if (t === "oval" || t === "dot") return "oval";
  if (t === "diamond" || t === "diamondthin") return "diamond";
  if (t === "basedash") return "dash";
  if (t === "manyoptional") return "open";
  if (t === "doubleblock") return "doubleBlock";
  return "filled";
}

/** 与 `render.ts` 中 `colorOr(..., "strokecolor", "#000000")` 一致。 */
export function edgeStrokeColor(style: Map<string, string>): string {
  const v = style.get("strokecolor");
  if (!v || v === "none") return "#000000";
  return v;
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

/** 生成稳定、可作 XML id 的片段（十六进制，无 `#`）。 */
export function arrowColorSlug(strokeRaw: string): string {
  const lower = strokeRaw.trim().toLowerCase();
  const hexOnly = lower.replace(/[^a-f0-9]/g, "");
  if (hexOnly.length >= 3) return hexOnly.slice(0, 32);
  let h = 2166136261;
  for (let i = 0; i < lower.length; i++) {
    h ^= lower.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * draw.io **`endSize` / `startSize`**：以 **`6`** 为默认比例 **1**，限制在约 **0.35～5**。
 */
export function edgeArrowSizeScale(style: Map<string, string>, end: boolean): number {
  const key = end ? "endsize" : "startsize";
  const raw = style.get(key);
  let s = 1;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) s = Math.max(0.35, Math.min(5, n / 6));
  }
  const arrowKey = end ? "endarrow" : "startarrow";
  const tok = (style.get(arrowKey) ?? "").toLowerCase();
  if (tok.includes("thin")) s *= 0.72;
  return s;
}

export function arrowMarkerId(
  kind: ArrowHeadKind,
  side: "end" | "start",
  strokeRaw: string,
  scale = 1,
): string {
  const base = `mx2svg-am-${kind}-${side}-${arrowColorSlug(strokeRaw)}`;
  const q = Math.round(scale * 1000);
  if (q === 1000) return base;
  return `${base}-${q}`;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** 消除 marker 属性里的二进制浮点噪声（如 14.399999）。 */
function mr(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function renderMarkerDef(
  id: string,
  kind: ArrowHeadKind,
  side: "end" | "start",
  strokeRaw: string,
  s: number,
): string {
  const c = escAttr(strokeRaw);
  const swOpen = Math.max(0.5, 1.5 * s);
  switch (kind) {
    case "none":
      return "";
    case "filled": {
      const w = 10 * s;
      const h = 10 * s;
      const refYE = 5 * s;
      if (side === "end") {
        return `<marker id="${id}" markerWidth="${mr(w)}" markerHeight="${mr(h)}" refX="${mr(9 * s)}" refY="${mr(refYE)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 0 0 L ${mr(10 * s)} ${mr(5 * s)} L 0 ${mr(10 * s)} z" fill="${c}"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="${mr(w)}" markerHeight="${mr(h)}" refX="${mr(1 * s)}" refY="${mr(refYE)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${mr(10 * s)} 0 L 0 ${mr(5 * s)} L ${mr(10 * s)} ${mr(10 * s)} z" fill="${c}"/></marker>`;
    }
    case "doubleBlock": {
      const h = 10 * s;
      const w = 13 * s;
      const refYE = 5 * s;
      if (side === "end") {
        return `<marker id="${id}" markerWidth="${mr(w)}" markerHeight="${mr(h)}" refX="${mr(12 * s)}" refY="${mr(refYE)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 0 0 L ${mr(5 * s)} ${mr(5 * s)} L 0 ${mr(10 * s)} z" fill="${c}"/>
  <path d="M ${mr(4 * s)} 0 L ${mr(9 * s)} ${mr(5 * s)} L ${mr(4 * s)} ${mr(10 * s)} z" fill="${c}"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="${mr(w)}" markerHeight="${mr(h)}" refX="${mr(1 * s)}" refY="${mr(refYE)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${mr(13 * s)} 0 L ${mr(8 * s)} ${mr(5 * s)} L ${mr(13 * s)} ${mr(10 * s)} z" fill="${c}"/>
  <path d="M ${mr(9 * s)} 0 L ${mr(4 * s)} ${mr(5 * s)} L ${mr(9 * s)} ${mr(10 * s)} z" fill="${c}"/></marker>`;
    }
    case "open": {
      const w = 12 * s;
      const h = 12 * s;
      if (side === "end") {
        return `<marker id="${id}" markerWidth="${mr(w)}" markerHeight="${mr(h)}" refX="${mr(11 * s)}" refY="${mr(6 * s)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${mr(s)} ${mr(s)} L ${mr(11 * s)} ${mr(6 * s)} L ${mr(s)} ${mr(11 * s)}" fill="none" stroke="${c}" stroke-width="${mr(swOpen)}" stroke-linejoin="round" stroke-linecap="round"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="${mr(w)}" markerHeight="${mr(h)}" refX="${mr(s)}" refY="${mr(6 * s)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${mr(11 * s)} ${mr(s)} L ${mr(s)} ${mr(6 * s)} L ${mr(11 * s)} ${mr(11 * s)}" fill="none" stroke="${c}" stroke-width="${mr(swOpen)}" stroke-linejoin="round" stroke-linecap="round"/></marker>`;
    }
    case "oval": {
      const w = 10 * s;
      const h = 10 * s;
      const refX = side === "end" ? 9 * s : 1 * s;
      return `<marker id="${id}" markerWidth="${mr(w)}" markerHeight="${mr(h)}" refX="${mr(refX)}" refY="${mr(5 * s)}" orient="auto" markerUnits="userSpaceOnUse">
  <ellipse cx="${mr(5 * s)}" cy="${mr(5 * s)}" rx="${mr(4 * s)}" ry="${mr(4 * s)}" fill="${c}"/></marker>`;
    }
    case "diamond":
      if (side === "end") {
        return `<marker id="${id}" markerWidth="${mr(12 * s)}" markerHeight="${mr(12 * s)}" refX="${mr(11 * s)}" refY="${mr(6 * s)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${mr(s)} ${mr(6 * s)} L ${mr(6 * s)} ${mr(s)} L ${mr(11 * s)} ${mr(6 * s)} L ${mr(6 * s)} ${mr(11 * s)} Z" fill="${c}"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="${mr(12 * s)}" markerHeight="${mr(12 * s)}" refX="${mr(s)}" refY="${mr(6 * s)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${mr(11 * s)} ${mr(6 * s)} L ${mr(6 * s)} ${mr(s)} L ${mr(s)} ${mr(6 * s)} L ${mr(6 * s)} ${mr(11 * s)} Z" fill="${c}"/></marker>`;
    case "dash": {
      const w = 10 * s;
      const ref = 5 * s;
      const swl = Math.max(1, 1.25 * s);
      return `<marker id="${id}" markerWidth="${mr(w)}" markerHeight="${mr(w)}" refX="${mr(ref)}" refY="${mr(ref)}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${mr(1.2 * s)} ${mr(8.8 * s)} L ${mr(8.8 * s)} ${mr(1.2 * s)}" fill="none" stroke="${c}" stroke-width="${mr(swl)}" stroke-linecap="round"/></marker>`;
    }
    default: {
      const _n: never = kind;
      return _n;
    }
  }
}

/** 本页边用到的箭头 marker（按笔画色去重）。 */
export function buildArrowMarkerDefs(edges: DiagramEdge[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of edges) {
    const stroke = edgeStrokeColor(e.style);
    const endK = parseEndArrow(e.style);
    const startK = parseStartArrow(e.style);
    const se = edgeArrowSizeScale(e.style, true);
    const ss = edgeArrowSizeScale(e.style, false);
    if (endK !== "none") {
      const id = arrowMarkerId(endK, "end", stroke, se);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(renderMarkerDef(id, endK, "end", stroke, se));
      }
    }
    if (startK !== "none") {
      const id = arrowMarkerId(startK, "start", stroke, ss);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(renderMarkerDef(id, startK, "start", stroke, ss));
      }
    }
  }
  return out.join("\n");
}

export function markerEndAttr(kind: ArrowHeadKind, strokeRaw: string, scale = 1): string {
  if (kind === "none") return "";
  return ` marker-end="url(#${arrowMarkerId(kind, "end", strokeRaw, scale)})"`;
}

export function markerStartAttr(kind: ArrowHeadKind, strokeRaw: string, scale = 1): string {
  if (kind === "none") return "";
  return ` marker-start="url(#${arrowMarkerId(kind, "start", strokeRaw, scale)})"`;
}
