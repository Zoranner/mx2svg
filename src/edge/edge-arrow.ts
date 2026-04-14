/**
 * 边箭头：`endArrow` / `startArrow` 常见取值 → SVG marker（颜色与边 `strokeColor` 一致）。
 */

import type { DiagramEdge } from "../core/model.ts";

export type ArrowHeadKind = "none" | "filled" | "open" | "oval" | "diamond";

function mapArrowToken(v: string): ArrowHeadKind {
  const t = v.toLowerCase().trim();
  if (t === "none" || t === "") return "none";
  if (t === "open" || t === "openthin" || t === "openasync") return "open";
  if (t === "oval" || t === "dot") return "oval";
  if (t === "diamond" || t === "diamondthin") return "diamond";
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
  if (raw == null || raw === "") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.max(0.35, Math.min(5, n / 6));
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
        return `<marker id="${id}" markerWidth="${w}" markerHeight="${h}" refX="${9 * s}" refY="${refYE}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 0 0 L ${10 * s} ${5 * s} L 0 ${10 * s} z" fill="${c}"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="${w}" markerHeight="${h}" refX="${1 * s}" refY="${refYE}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${10 * s} 0 L 0 ${5 * s} L ${10 * s} ${10 * s} z" fill="${c}"/></marker>`;
    }
    case "open": {
      const w = 12 * s;
      const h = 12 * s;
      if (side === "end") {
        return `<marker id="${id}" markerWidth="${w}" markerHeight="${h}" refX="${11 * s}" refY="${6 * s}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${s} ${s} L ${11 * s} ${6 * s} L ${s} ${11 * s}" fill="none" stroke="${c}" stroke-width="${swOpen}" stroke-linejoin="round" stroke-linecap="round"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="${w}" markerHeight="${h}" refX="${s}" refY="${6 * s}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${11 * s} ${s} L ${s} ${6 * s} L ${11 * s} ${11 * s}" fill="none" stroke="${c}" stroke-width="${swOpen}" stroke-linejoin="round" stroke-linecap="round"/></marker>`;
    }
    case "oval": {
      const w = 10 * s;
      const h = 10 * s;
      const refX = side === "end" ? 9 * s : 1 * s;
      return `<marker id="${id}" markerWidth="${w}" markerHeight="${h}" refX="${refX}" refY="${5 * s}" orient="auto" markerUnits="userSpaceOnUse">
  <ellipse cx="${5 * s}" cy="${5 * s}" rx="${4 * s}" ry="${4 * s}" fill="${c}"/></marker>`;
    }
    case "diamond":
      if (side === "end") {
        return `<marker id="${id}" markerWidth="${12 * s}" markerHeight="${12 * s}" refX="${11 * s}" refY="${6 * s}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${s} ${6 * s} L ${6 * s} ${s} L ${11 * s} ${6 * s} L ${6 * s} ${11 * s} Z" fill="${c}"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="${12 * s}" markerHeight="${12 * s}" refX="${s}" refY="${6 * s}" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M ${11 * s} ${6 * s} L ${6 * s} ${s} L ${s} ${6 * s} L ${6 * s} ${11 * s} Z" fill="${c}"/></marker>`;
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
