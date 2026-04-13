import type { DiagramDoc, DiagramEdge, DiagramNode } from "./model.ts";
import { shapePathD } from "./shape-path.ts";

export interface RenderOptions {
  /** 渲染第几页（0-based），默认 0 */
  pageIndex?: number;
  padding?: number;
  backgroundColor?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function colorOr(style: Map<string, string>, key: string, fallback: string): string {
  const v = style.get(key);
  if (!v || v === "none") return fallback;
  return v;
}

/** draw.io `gradientDirection` → SVG objectBoundingBox 线性渐变向量 */
function gradientDirectionToPercents(dirRaw: string): { x1: string; y1: string; x2: string; y2: string } {
  const d = (dirRaw || "south").toLowerCase().replace(/\s+/g, "");
  switch (d) {
    case "north":
      return { x1: "0%", y1: "100%", x2: "0%", y2: "0%" };
    case "south":
      return { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
    case "east":
      return { x1: "0%", y1: "0%", x2: "100%", y2: "0%" };
    case "west":
      return { x1: "100%", y1: "0%", x2: "0%", y2: "0%" };
    case "northeast":
      return { x1: "0%", y1: "100%", x2: "100%", y2: "0%" };
    case "northwest":
      return { x1: "100%", y1: "100%", x2: "0%", y2: "0%" };
    case "southeast":
      return { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };
    case "southwest":
      return { x1: "100%", y1: "0%", x2: "0%", y2: "100%" };
    default:
      return { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
  }
}

function strokeDashAttr(style: Map<string, string>): string {
  const d = style.get("dashed");
  if (d === "1" || d === "true") return ' stroke-dasharray="6 4"';
  if (style.has("dashed") && (d === undefined || d === "")) return ' stroke-dasharray="6 4"';
  return "";
}

/** 矩形圆角：`rounded=1` 为比例圆角；`rounded=N` 为像素半径；`rounded=0` 关闭。 */
function rectCornerRadius(style: Map<string, string>, w: number, h: number): number {
  const r = style.get("rounded");
  if (r === "0" || r === "false") return 0;

  if (r && r !== "1" && r !== "true") {
    const n = Number(r);
    if (Number.isFinite(n)) {
      if (n <= 0) return 0;
      return Math.min(n, Math.min(w, h) / 2);
    }
  }

  const useDefaultRound =
    r === "1" || r === "true" || (style.has("rounded") && (r === undefined || r === ""));
  if (!useDefaultRound) {
    const arc = style.get("arcsize");
    if (arc) {
      const pct = Number(arc);
      if (Number.isFinite(pct) && pct > 0) {
        return Math.min((Math.min(w, h) * pct) / 100, Math.min(w, h) / 2);
      }
    }
    return 0;
  }

  return Math.min(12, Math.min(w, h) / 4);
}

interface GradientBuildContext {
  fragments: string[];
  nextId: number;
}

function allocFill(
  style: Map<string, string>,
  baseFill: string,
  g: GradientBuildContext,
): string {
  const g2 = colorOr(style, "gradientcolor", "");
  if (!g2 || g2 === "none") {
    return esc(baseFill);
  }
  const dir = style.get("gradientdirection") ?? "south";
  const { x1, y1, x2, y2 } = gradientDirectionToPercents(dir);
  const id = `mx2svg-g-${g.nextId++}`;
  g.fragments.push(
    `<linearGradient id="${id}" gradientUnits="objectBoundingBox" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="${esc(baseFill)}"/>
      <stop offset="100%" stop-color="${esc(g2)}"/>
    </linearGradient>`,
  );
  return `url(#${id})`;
}

function bounds(page: { nodes: DiagramNode[]; edges: DiagramEdge[] }): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const bump = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const n of page.nodes) {
    bump(n.x, n.y);
    bump(n.x + n.width, n.y + n.height);
  }
  for (const e of page.edges) {
    for (const p of e.points) {
      bump(p.x, p.y);
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }
  return { minX, minY, maxX, maxY };
}

/** 形状内居中标签：单行用 dominant-baseline；多行用绝对 y 的 tspan 垂直居中。 */
function renderSvgLabelBlock(cx: number, cy: number, fs: number, label: string): string {
  const lines = label.split(/\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return "";

  const lh = fs * 1.2;
  const escLine = (s: string) => esc(s.trim());

  if (lines.length === 1) {
    return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-family="Arial, Helvetica, sans-serif" fill="#000000">${escLine(
      lines[0],
    )}</text>`;
  }

  const yFirst = cy - ((lines.length - 1) * lh) / 2;
  const tspans = lines
    .map((line, i) => `<tspan x="${cx}" y="${yFirst + i * lh}">${escLine(line)}</tspan>`)
    .join("");
  return `<text text-anchor="middle" font-size="${fs}" font-family="Arial, Helvetica, sans-serif" fill="#000000">${tspans}</text>`;
}

function wantsArrowEnd(style: Map<string, string>): boolean {
  const v = (style.get("endarrow") ?? "classic").toLowerCase();
  return v !== "none" && v !== "open" && v !== "oval" && v !== "diamond";
}

function renderEdge(e: DiagramEdge): string {
  const stroke = colorOr(e.style, "strokecolor", "#000000");
  const sw = Number(e.style.get("strokewidth") ?? "1") || 1;
  const pts = e.points.map((p) => `${p.x},${p.y}`).join(" ");
  const dashAttr = strokeDashAttr(e.style);
  const arrow = wantsArrowEnd(e.style);
  const markerEnd = arrow ? ' marker-end="url(#mx2svg-arrow-end)"' : "";

  return `<g data-mx2svg-edge="${esc(e.id)}"><polyline points="${pts}" fill="none" stroke="${esc(
    stroke,
  )}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dashAttr}${markerEnd}/></g>`;
}

function renderNode(n: DiagramNode, g: GradientBuildContext): string {
  const fillSolid = colorOr(n.style, "fillcolor", "#dae8fc");
  const fill = allocFill(n.style, fillSolid, g);
  const stroke = colorOr(n.style, "strokecolor", "#6c8ebf");
  const sw = Number(n.style.get("strokewidth") ?? "1") || 1;
  const fs = Number(n.style.get("fontsize") ?? "12") || 12;
  const dashAttr = strokeDashAttr(n.style);
  const parts: string[] = [];

  const pathD = shapePathD(n.shape, n.x, n.y, n.width, n.height);
  if (pathD) {
    parts.push(
      `<path d="${pathD}" fill="${fill}" stroke="${esc(stroke)}" stroke-width="${sw}" stroke-linejoin="round"${dashAttr}/>`,
    );
  } else if (n.shape === "ellipse") {
    const cx = n.x + n.width / 2;
    const cy = n.y + n.height / 2;
    const rx = n.width / 2;
    const ry = n.height / 2;
    parts.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${esc(stroke)}" stroke-width="${sw}"${dashAttr}/>`,
    );
  } else {
    const rx = rectCornerRadius(n.style, n.width, n.height);
    parts.push(
      `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="${esc(
        stroke,
      )}" stroke-width="${sw}" rx="${rx}" ry="${rx}"${dashAttr}/>`,
    );
  }

  if (n.label.trim()) {
    const tx = n.x + n.width / 2;
    const ty = n.y + n.height / 2;
    parts.push(renderSvgLabelBlock(tx, ty, fs, n.label));
  }

  return `<g data-mx2svg-id="${esc(n.id)}">${parts.join("")}</g>`;
}

const ARROW_DEFS = `<marker id="mx2svg-arrow-end" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
 <path d="M 0 0 L 10 5 L 0 10 z" fill="#333333"/>
  </marker>`;

export function renderToSvg(doc: DiagramDoc, options: RenderOptions = {}): string {
  const pageIndex = options.pageIndex ?? 0;
  const pad = options.padding ?? 8;
  const bg = options.backgroundColor ?? "#ffffff";

  const page = doc.pages[pageIndex];
  if (!page) {
    throw new Error(`mx2svg: pageIndex ${pageIndex} out of range (${doc.pages.length} pages)`);
  }

  const { minX, minY, maxX, maxY } = bounds(page);
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  const gctx: GradientBuildContext = { fragments: [], nextId: 0 };
  const edgeLayer = page.edges.map((e) => renderEdge(e)).join("\n");
  const nodeLayer = page.nodes.map((n) => renderNode(n, gctx)).join("\n");

  const gradientBlock =
    gctx.fragments.length > 0 ? `${gctx.fragments.join("\n  ")}` : "";
  const defsInner = [ARROW_DEFS, gradientBlock].filter(Boolean).join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">
  <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="${esc(bg)}"/>
  <defs>
  ${defsInner}
  </defs>
  ${edgeLayer}
  ${nodeLayer}
</svg>`;
}
