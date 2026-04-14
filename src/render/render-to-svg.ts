import type { DiagramDoc } from "../core/model.ts";
import { buildArrowMarkerDefs } from "../edge/edge-arrow.ts";
import { pageContentBounds } from "./bounds.ts";
import { computeEdgeLineMetrics } from "./edge-line-metrics.ts";
import type { RenderOptions } from "./options.ts";
import { pageBakeOriginFromBounds } from "./page-bake.ts";
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
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;
  /** 与 draw.io 导出一致：坐标烘焙到 viewBox，无外层 translate。 */
  const bake = pageBakeOriginFromBounds(minX, minY, pad);

  const gctx: GradientBuildContext = { fragments: [], nextId: 0 };
  const defaultFontStack = options.defaultFontStack;
  const nodeById = new Map(page.nodes.map((n) => [n.id, n] as const));
  const edgeById = new Map(page.edges.map((e) => [e.id, e] as const));

  const bodyLayers: string[] = [];
  if (page.renderOrder?.length) {
    for (const item of page.renderOrder) {
      if (item.kind === "node") {
        const n = nodeById.get(item.id);
        if (n) bodyLayers.push(renderVertex(n, gctx, bake, defaultFontStack));
      } else {
        const e = edgeById.get(item.id);
        if (e) bodyLayers.push(renderEdge(e, edgeMetrics.get(e.id)!, gctx, bake, defaultFontStack));
      }
    }
  } else {
    for (const n of page.nodes) bodyLayers.push(renderVertex(n, gctx, bake, defaultFontStack));
    for (const e of page.edges) {
      bodyLayers.push(renderEdge(e, edgeMetrics.get(e.id)!, gctx, bake, defaultFontStack));
    }
  }
  const contentLayer = bodyLayers.join("\n");

  const gradientBlock = gctx.fragments.length > 0 ? `${gctx.fragments.join("\n  ")}` : "";
  const shadowBlock = page.nodes.some((n) => mxStyleShadowEnabled(n.style))
    ? dropShadowFilterDefXml()
    : "";
  const defsInner = [buildArrowMarkerDefs(page.edges), gradientBlock, shadowBlock]
    .filter(Boolean)
    .join("\n  ");

  /** `renderOrder` 与 draw.io mxCell 顺序一致；缺省时为全部顶点后全部边。 */
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="0 0 ${vbW} ${vbH}">
  <rect x="0" y="0" width="${vbW}" height="${vbH}" fill="${esc(bg)}"/>
  <defs>
  ${defsInner}
  </defs>
  ${contentLayer}
</svg>`;
}
