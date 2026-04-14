import { buildCurvedEdgePathD, curvedEdgeToPolylineApprox, isCurvedEdgeStyle } from "./edge-curve.ts";
import {
  buildJumpPathDAndPolyline,
  collectJumpMap,
  type EdgeWaypointRef,
} from "./edge-jump.ts";
import {
  buildRoundedOrthogonalPathD,
  edgePolylineForLengthAndBounds,
  edgeRoundedArcSizeFromStyle,
  roundedOrthogonalToPolylineApprox,
  useRoundedOrthogonalPath,
} from "./edge-rounded.ts";
import type { DiagramDoc, DiagramEdge, DiagramNode } from "./model.ts";
import {
  ARROW_MARKER_DEFS,
  markerEndAttr,
  markerStartAttr,
  parseEndArrow,
  parseStartArrow,
} from "./edge-arrow.ts";
import {
  polylinePointAtLengthFraction,
  polylinePointWithPerpendicularOffset,
} from "./polyline.ts";
import { shapePathD, vertexLabelCenter } from "./shape-path.ts";
import { measureVertexLabelDisplayBlock, wrapVertexLabelToBoxWidth } from "./wrap-label.ts";

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

function bumpRotatedRect(
  bump: (x: number, y: number) => void,
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg: number,
): void {
  if (!rotationDeg) {
    bump(x, y);
    bump(x + w, y + h);
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  for (const [px, py] of corners) {
    const dx = px - cx;
    const dy = py - cy;
    bump(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
  }
}

interface EdgeLineMetrics {
  metricsPolyline: { x: number; y: number }[];
  pathD: string | null;
  polylinePoints: { x: number; y: number }[] | null;
}

function computeEdgeLineMetrics(edges: DiagramEdge[]): Map<string, EdgeLineMetrics> {
  const waypoints: EdgeWaypointRef[] = edges.map((e) => ({
    id: e.id,
    points: e.points,
    style: e.style,
  }));
  const out = new Map<string, EdgeLineMetrics>();

  for (const e of edges) {
    const sw = Number(e.style.get("strokewidth") ?? "1") || 1;
    const ref: EdgeWaypointRef = { id: e.id, points: e.points, style: e.style };
    const jumpMap = collectJumpMap(e.points, ref, waypoints);
    const jump = buildJumpPathDAndPolyline(e.points, jumpMap, e.style, sw);

    if (jump) {
      out.set(e.id, {
        metricsPolyline: jump.polyline,
        pathD: jump.d,
        polylinePoints: null,
      });
      continue;
    }

    if (isCurvedEdgeStyle(e.style)) {
      out.set(e.id, {
        metricsPolyline: curvedEdgeToPolylineApprox(e.points),
        pathD: buildCurvedEdgePathD(e.points),
        polylinePoints: null,
      });
      continue;
    }

    if (useRoundedOrthogonalPath(e.style, e.points.length)) {
      const arc = edgeRoundedArcSizeFromStyle(e.style);
      out.set(e.id, {
        metricsPolyline: roundedOrthogonalToPolylineApprox(e.points, arc),
        pathD: buildRoundedOrthogonalPathD(e.points, arc),
        polylinePoints: null,
      });
      continue;
    }

    const metricsPolyline = edgePolylineForLengthAndBounds(e.points, e.style);
    out.set(e.id, {
      metricsPolyline,
      pathD: null,
      polylinePoints: e.points,
    });
  }

  return out;
}

function bounds(
  page: { nodes: DiagramNode[]; edges: DiagramEdge[] },
  edgeMetrics: Map<string, EdgeLineMetrics>,
): {
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
    bumpRotatedRect(bump, n.x, n.y, n.width, n.height, n.rotation);
  }
  for (const e of page.edges) {
    const m = edgeMetrics.get(e.id);
    const pts = m?.metricsPolyline ?? e.points;
    for (const p of pts) {
      bump(p.x, p.y);
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }
  return { minX, minY, maxX, maxY };
}

function edgeLabelAnchor(e: DiagramEdge, metrics: { x: number; y: number }[]): { x: number; y: number } {
  if (metrics.length < 2) {
    return metrics[0] ?? { x: 0, y: 0 };
  }
  if (e.edgeLabelPath) {
    return polylinePointWithPerpendicularOffset(
      metrics,
      e.edgeLabelPath.fraction,
      e.edgeLabelPath.normalOffset,
    );
  }
  if (e.edgeLabelMidOffset) {
    const mid = polylinePointAtLengthFraction(metrics, 0.5);
    return { x: mid.x + e.edgeLabelMidOffset.dx, y: mid.y + e.edgeLabelMidOffset.dy };
  }
  if (e.labelPosition) {
    return e.labelPosition;
  }
  return polylinePointAtLengthFraction(metrics, 0.5);
}

interface LabelBlockOpts {
  /** 浅色描边，叠在折线等深色背景上时提高可读性 */
  contrastStroke?: boolean;
  /** 对应 draw.io `fontColor`，默认 `#000000` */
  fill?: string;
}

/** 形状内居中标签：单行用 dominant-baseline；多行用绝对 y 的 tspan 垂直居中。 */
function renderSvgLabelBlock(
  cx: number,
  cy: number,
  fs: number,
  label: string,
  opts?: LabelBlockOpts,
): string {
  const lines = label.split(/\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return "";

  const lh = fs * 1.2;
  const escLine = (s: string) => esc(s.trim());
  const fill = esc(opts?.fill ?? "#000000");
  const halo =
    opts?.contrastStroke === true
      ? ' paint-order="stroke fill" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round"'
      : "";

  if (lines.length === 1) {
    return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-family="Arial, Helvetica, sans-serif" fill="${fill}"${halo}>${escLine(
      lines[0],
    )}</text>`;
  }

  const yFirst = cy - ((lines.length - 1) * lh) / 2;
  const tspans = lines
    .map((line, i) => `<tspan x="${cx}" y="${yFirst + i * lh}">${escLine(line)}</tspan>`)
    .join("");
  return `<text text-anchor="middle" font-size="${fs}" font-family="Arial, Helvetica, sans-serif" fill="${fill}"${halo}>${tspans}</text>`;
}

function renderEdge(e: DiagramEdge, m: EdgeLineMetrics): string {
  const stroke = colorOr(e.style, "strokecolor", "#000000");
  const sw = Number(e.style.get("strokewidth") ?? "1") || 1;
  const fs = Number(e.style.get("fontsize") ?? "11") || 11;
  const dashAttr = strokeDashAttr(e.style);
  const markerEnd = markerEndAttr(parseEndArrow(e.style));
  const markerStart = markerStartAttr(parseStartArrow(e.style));

  const pathD = m.pathD;
  const lineEl =
    pathD != null
      ? `<path d="${esc(pathD)}" fill="none" stroke="${esc(
          stroke,
        )}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dashAttr}${markerStart}${markerEnd}/>`
      : `<polyline points="${(m.polylinePoints ?? e.points).map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${esc(
          stroke,
        )}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dashAttr}${markerStart}${markerEnd}/>`;

  const parts: string[] = [lineEl];

  if (e.label.trim()) {
    const anchor = edgeLabelAnchor(e, m.metricsPolyline);
    const labelFill = colorOr(e.style, "fontcolor", "#000000");
    parts.push(
      renderSvgLabelBlock(anchor.x, anchor.y, fs, e.label, { contrastStroke: true, fill: labelFill }),
    );
  }

  return `<g data-mx2svg-edge="${esc(e.id)}">${parts.join("")}</g>`;
}

function renderNode(n: DiagramNode, g: GradientBuildContext): string {
  const fillSolid = colorOr(n.style, "fillcolor", "#dae8fc");
  const fill = allocFill(n.style, fillSolid, g);
  const stroke = colorOr(n.style, "strokecolor", "#6c8ebf");
  const sw = Number(n.style.get("strokewidth") ?? "1") || 1;
  const fs = Number(n.style.get("fontsize") ?? "12") || 12;
  const dashAttr = strokeDashAttr(n.style);
  const parts: string[] = [];

  const pathD = shapePathD(n.shape, n.x, n.y, n.width, n.height, n.style);
  if (pathD) {
    parts.push(
      `<path d="${pathD}" fill="${fill}" stroke="${esc(stroke)}" stroke-width="${sw}" stroke-linejoin="round"${dashAttr}/>`,
    );
  } else if (n.shape === "internalStorage") {
    const rounded = n.style.get("rounded") === "1" || n.style.get("rounded") === "true";
    const arcFrac = (Number(n.style.get("arcsize")) || 15) / 100;
    let inset = 0;
    if (rounded) {
      inset = Math.max(inset, Math.min(n.width * arcFrac, n.height * arcFrac));
    }
    const dx = Math.max(inset, Math.min(n.width, Number(n.style.get("dx")) || 15));
    const dy = Math.max(inset, Math.min(n.height, Number(n.style.get("dy")) || 15));
    const rx = rounded ? Math.min(n.width * arcFrac, n.height * arcFrac) : 0;
    parts.push(
      `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="${esc(
        stroke,
      )}" stroke-width="${sw}" rx="${rx}" ry="${rx}"${dashAttr}/>`,
    );
    const lineStroke = esc(stroke);
    parts.push(
      `<line x1="${n.x}" y1="${n.y + dy}" x2="${n.x + n.width}" y2="${n.y + dy}" stroke="${lineStroke}" stroke-width="${sw}" stroke-linecap="round"/>`,
    );
    parts.push(
      `<line x1="${n.x + dx}" y1="${n.y}" x2="${n.x + dx}" y2="${n.y + n.height}" stroke="${lineStroke}" stroke-width="${sw}" stroke-linecap="round"/>`,
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
    const { cx: tx, cy: ty } = vertexLabelCenter(n.shape, n.x, n.y, n.width, n.height, n.style);
    const labelInset = 8;
    const softWrap = n.style.get("whitespace") === "wrap";
    const wrap = softWrap ? wrapVertexLabelToBoxWidth(n.label, n.width, fs, labelInset) : n.label;
    const labelBg = colorOr(n.style, "labelbackgroundcolor", "");
    if (labelBg && labelBg !== "none") {
      const { width: tw, height: th } = measureVertexLabelDisplayBlock(
        wrap,
        n.width,
        fs,
        labelInset,
        softWrap,
      );
      const pad = 4;
      const bw = tw + pad * 2;
      const bh = th + pad * 2;
      const bx = tx - bw / 2;
      const by = ty - bh / 2;
      parts.push(
        `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="4" ry="4" fill="${esc(labelBg)}"/>`,
      );
    }
    const labelFill = colorOr(n.style, "fontcolor", "#000000");
    parts.push(renderSvgLabelBlock(tx, ty, fs, wrap, { fill: labelFill }));
  }

  const inner = parts.join("");
  if (n.rotation !== 0) {
    const rcx = n.x + n.width / 2;
    const rcy = n.y + n.height / 2;
    return `<g data-mx2svg-id="${esc(n.id)}"><g transform="rotate(${n.rotation}, ${rcx}, ${rcy})">${inner}</g></g>`;
  }
  return `<g data-mx2svg-id="${esc(n.id)}">${inner}</g>`;
}

export function renderToSvg(doc: DiagramDoc, options: RenderOptions = {}): string {
  const pageIndex = options.pageIndex ?? 0;
  const pad = options.padding ?? 8;
  const bg = options.backgroundColor ?? "#ffffff";

  const page = doc.pages[pageIndex];
  if (!page) {
    throw new Error(`mx2svg: pageIndex ${pageIndex} out of range (${doc.pages.length} pages)`);
  }

  const edgeMetrics = computeEdgeLineMetrics(page.edges);
  const { minX, minY, maxX, maxY } = bounds(page, edgeMetrics);
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  const gctx: GradientBuildContext = { fragments: [], nextId: 0 };
  const edgeLayer = page.edges.map((e) => renderEdge(e, edgeMetrics.get(e.id)!)).join("\n");
  const nodeLayer = page.nodes.map((n) => renderNode(n, gctx)).join("\n");

  const gradientBlock =
    gctx.fragments.length > 0 ? `${gctx.fragments.join("\n  ")}` : "";
  const defsInner = [ARROW_MARKER_DEFS, gradientBlock].filter(Boolean).join("\n  ");

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
