import type { DiagramDoc, DiagramEdge, DiagramNode } from "./model.ts";

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

function wantsArrowEnd(style: Map<string, string>): boolean {
  const v = (style.get("endarrow") ?? "classic").toLowerCase();
  return v !== "none" && v !== "open" && v !== "oval" && v !== "diamond";
}

function renderEdge(e: DiagramEdge): string {
  const stroke = colorOr(e.style, "strokecolor", "#000000");
  const sw = Number(e.style.get("strokewidth") ?? "1") || 1;
  const pts = e.points.map((p) => `${p.x},${p.y}`).join(" ");
  const dashed = e.style.get("dashed") === "1" || (e.style.get("dashed") ?? "") === "true";
  const dashAttr = dashed ? ` stroke-dasharray="6 4"` : "";
  const arrow = wantsArrowEnd(e.style);
  const markerEnd = arrow ? ' marker-end="url(#mx2svg-arrow-end)"' : "";

  return `<g data-mx2svg-edge="${esc(e.id)}"><polyline points="${pts}" fill="none" stroke="${esc(
    stroke,
  )}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dashAttr}${markerEnd}/></g>`;
}

function renderNode(n: DiagramNode): string {
  const fill = colorOr(n.style, "fillcolor", "#dae8fc");
  const stroke = colorOr(n.style, "strokecolor", "#6c8ebf");
  const sw = Number(n.style.get("strokewidth") ?? "1") || 1;
  const fs = Number(n.style.get("fontsize") ?? "12") || 12;
  const parts: string[] = [];

  if (n.shape === "ellipse") {
    const cx = n.x + n.width / 2;
    const cy = n.y + n.height / 2;
    const rx = n.width / 2;
    const ry = n.height / 2;
    parts.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${sw}"/>`,
    );
  } else {
    parts.push(
      `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${sw}" rx="0"/>`,
    );
  }

  if (n.label.trim()) {
    const tx = n.x + n.width / 2;
    const ty = n.y + n.height / 2;
    parts.push(
      `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-family="Arial, Helvetica, sans-serif" fill="#000000">${esc(n.label)}</text>`,
    );
  }

  return `<g data-mx2svg-id="${esc(n.id)}">${parts.join("")}</g>`;
}

const ARROW_DEFS = `<defs>
  <marker id="mx2svg-arrow-end" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#333333"/>
  </marker>
</defs>`;

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

  const edgeLayer = page.edges.map((e) => renderEdge(e)).join("\n");
  const nodeLayer = page.nodes.map((n) => renderNode(n)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">
  <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="${esc(bg)}"/>
  ${ARROW_DEFS}
  ${edgeLayer}
  ${nodeLayer}
</svg>`;
}
