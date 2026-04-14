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

export function arrowMarkerId(
  kind: ArrowHeadKind,
  side: "end" | "start",
  strokeRaw: string,
): string {
  return `mx2svg-am-${kind}-${side}-${arrowColorSlug(strokeRaw)}`;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderMarkerDef(
  id: string,
  kind: ArrowHeadKind,
  side: "end" | "start",
  strokeRaw: string,
): string {
  const c = escAttr(strokeRaw);
  switch (kind) {
    case "none":
      return "";
    case "filled":
      if (side === "end") {
        return `<marker id="${id}" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="${c}"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 10 0 L 0 5 L 10 10 z" fill="${c}"/></marker>`;
    case "open":
      if (side === "end") {
        return `<marker id="${id}" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 1 1 L 11 6 L 1 11" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="12" markerHeight="12" refX="1" refY="6" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 11 1 L 1 6 L 11 11" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></marker>`;
    case "oval":
      return `<marker id="${id}" markerWidth="10" markerHeight="10" refX="${side === "end" ? "9" : "1"}" refY="5" orient="auto" markerUnits="userSpaceOnUse">
  <ellipse cx="5" cy="5" rx="4" ry="4" fill="${c}"/></marker>`;
    case "diamond":
      if (side === "end") {
        return `<marker id="${id}" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 1 6 L 6 1 L 11 6 L 6 11 Z" fill="${c}"/></marker>`;
      }
      return `<marker id="${id}" markerWidth="12" markerHeight="12" refX="1" refY="6" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M 11 6 L 6 1 L 1 6 L 6 11 Z" fill="${c}"/></marker>`;
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
    if (endK !== "none") {
      const id = arrowMarkerId(endK, "end", stroke);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(renderMarkerDef(id, endK, "end", stroke));
      }
    }
    if (startK !== "none") {
      const id = arrowMarkerId(startK, "start", stroke);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(renderMarkerDef(id, startK, "start", stroke));
      }
    }
  }
  return out.join("\n");
}

export function markerEndAttr(kind: ArrowHeadKind, strokeRaw: string): string {
  if (kind === "none") return "";
  return ` marker-end="url(#${arrowMarkerId(kind, "end", strokeRaw)})"`;
}

export function markerStartAttr(kind: ArrowHeadKind, strokeRaw: string): string {
  if (kind === "none") return "";
  return ` marker-start="url(#${arrowMarkerId(kind, "start", strokeRaw)})"`;
}
