import type { DiagramEdge, DiagramNode } from "../model.ts";
import type { EdgeLineMetrics } from "./edge-line-metrics.ts";
import { bumpRotatedRect } from "./svg-util.ts";

export function pageContentBounds(
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
