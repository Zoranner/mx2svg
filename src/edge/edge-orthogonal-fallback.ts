import type { DiagramNode } from "../core/model.ts";

/** 无显式路点时，将「两中心/间距端点」连线改为直角折线，贴近 draw.io 的 orthogonalEdgeStyle。 */

export function styleIsOrthogonalEdge(style: Map<string, string>): boolean {
  const es = (style.get("edgestyle") ?? "").toLowerCase();
  return es.includes("orthogonal");
}

const EDGE_EPS = 0.75;

function onHorizontalEdge(p: { x: number; y: number }, n: DiagramNode): boolean {
  return Math.abs(p.y - n.y) < EDGE_EPS || Math.abs(p.y - (n.y + n.height)) < EDGE_EPS;
}

function onVerticalEdge(p: { x: number; y: number }, n: DiagramNode): boolean {
  return Math.abs(p.x - n.x) < EDGE_EPS || Math.abs(p.x - (n.x + n.width)) < EDGE_EPS;
}

/**
 * 根据端点落在源/目标的顶底边或左右边，判断 Z 形中间道应走水平道（竖-横-竖）还是竖道（横-竖-横）。
 */
export function inferOrthogonalZTrunk(
  start: { x: number; y: number },
  source: DiagramNode,
  end: { x: number; y: number },
  target: DiagramNode,
): "vertical" | "horizontal" {
  const sh = onHorizontalEdge(start, source);
  const th = onHorizontalEdge(end, target);
  const sv = onVerticalEdge(start, source);
  const tv = onVerticalEdge(end, target);
  if (sh && th) return "vertical";
  if (sv && tv) return "horizontal";
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.abs(dy) >= Math.abs(dx) ? "vertical" : "horizontal";
}

/**
 * Z 形三段正交路径（贴近 draw.io：竖-横-竖 或 横-竖-横）。
 * `trunk` 为 `"vertical"` 时中间为水平道（竖-横-竖）；为 `"horizontal"` 时中间为竖道（横-竖-横）。
 * 未传 `trunk` 时按 `|dy|` 与 `|dx|` 判定（与旧行为兼容）。
 */
export function orthogonalizeTwoPointPolyline(
  pts: { x: number; y: number }[],
  trunk?: "vertical" | "horizontal",
): { x: number; y: number }[] {
  if (pts.length !== 2) return pts;
  const p0 = pts[0]!;
  const p1 = pts[1]!;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  if (dx === 0 || dy === 0) return pts;
  const useVHV = trunk === "vertical" || (trunk === undefined && Math.abs(dy) >= Math.abs(dx));
  if (useVHV) {
    const midY = (p0.y + p1.y) / 2;
    return [p0, { x: p0.x, y: midY }, { x: p1.x, y: midY }, p1];
  }
  const midX = (p0.x + p1.x) / 2;
  return [p0, { x: midX, y: p0.y }, { x: midX, y: p1.y }, p1];
}
