import type { DiagramDoc } from "../core/model.ts";
import { buildArrowMarkerDefs } from "../edge/edge-arrow.ts";
import { pageContentBounds } from "./bounds.ts";
import { computeEdgeLineMetrics } from "./edge-line-metrics.ts";
import type { RenderOptions } from "./options.ts";
import { renderEdge } from "./render-edge.ts";
import { renderVertex } from "./render-vertex.ts";
import {
  dropShadowFilterDefXml,
  esc,
  type GradientBuildContext,
  mxStyleShadowEnabled,
} from "./svg-util.ts";

export type { RenderOptions } from "./options.ts";

export function renderToSvg(doc: DiagramDoc, options: RenderOptions = {}): string {
  const pageIndex = options.pageIndex ?? 0;
  const pad = options.padding ?? 8;
  const bg = options.backgroundColor ?? "#ffffff";

  const page = doc.pages[pageIndex];
  if (!page) {
    throw new Error(`mx2svg: pageIndex ${pageIndex} out of range (${doc.pages.length} pages)`);
  }

  const edgeMetrics = computeEdgeLineMetrics(page.edges);
  const { minX, minY, maxX, maxY } = pageContentBounds(page, edgeMetrics);
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  const gctx: GradientBuildContext = { fragments: [], nextId: 0 };
  const defaultFontStack = options.defaultFontStack;
  const edgeLayer = page.edges
    .map((e) => renderEdge(e, edgeMetrics.get(e.id)!, defaultFontStack))
    .join("\n");
  const nodeLayer = page.nodes.map((n) => renderVertex(n, gctx, defaultFontStack)).join("\n");

  const gradientBlock = gctx.fragments.length > 0 ? `${gctx.fragments.join("\n  ")}` : "";
  const shadowBlock = page.nodes.some((n) => mxStyleShadowEnabled(n.style))
    ? dropShadowFilterDefXml()
    : "";
  const defsInner = [buildArrowMarkerDefs(page.edges), gradientBlock, shadowBlock]
    .filter(Boolean)
    .join("\n  ");

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
