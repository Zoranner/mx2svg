import type { DiagramEdge, DiagramNode } from "../core/model.ts";

function nodeCenter(n: DiagramNode): { x: number; y: number } {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * draw.io 里 `sourcePoint`→`targetPoint` 有时与 `source`/`target` 拓扑相反，导致 SVG `marker-end` 画在逻辑上的「源」一侧。
 * 用端点与各端 cell 中心的距离判定，必要时反序折线并交换起止箭头样式。
 */
export function applyEdgePointDirectionFromTerminals(
  e: DiagramEdge,
  nodeById: Map<string, DiagramNode>,
): void {
  const pts = e.points;
  if (pts.length < 2) return;

  const p0 = pts[0]!;
  const pL = pts[pts.length - 1]!;
  const { source, target } = e;

  let reverse = false;

  if (source && target) {
    const a = nodeById.get(source);
    const b = nodeById.get(target);
    if (a && b) {
      const sc = nodeCenter(a);
      const tc = nodeCenter(b);
      const forward = dist(p0, sc) + dist(pL, tc);
      const backward = dist(p0, tc) + dist(pL, sc);
      if (backward + 1 < forward) reverse = true;
    }
  } else if (target && !source) {
    const b = nodeById.get(target);
    if (b) {
      const tc = nodeCenter(b);
      if (dist(p0, tc) + 1 < dist(pL, tc)) reverse = true;
    }
  } else if (source && !target) {
    const a = nodeById.get(source);
    if (a) {
      const sc = nodeCenter(a);
      if (dist(pL, sc) + 1 < dist(p0, sc)) reverse = true;
    }
  }

  if (!reverse) return;

  e.points = [...pts].reverse();
  swapDirectedEdgeStyle(e.style);

  if (e.edgeLabelPath) {
    const { fraction, normalOffset } = e.edgeLabelPath;
    if (fraction >= 0 && fraction <= 1) {
      e.edgeLabelPath = { fraction: 1 - fraction, normalOffset: -normalOffset };
    }
  }
}

function swapDirectedEdgeStyle(style: Map<string, string>): void {
  const endArrow = style.get("endarrow");
  const startArrow = style.get("startarrow");
  const endTok = endArrow !== undefined && endArrow !== "" ? endArrow : "classic";
  const startTok = startArrow !== undefined && startArrow !== "" ? startArrow : "none";
  style.set("endarrow", startTok);
  style.set("startarrow", endTok);

  const endSize = style.get("endsize");
  const startSize = style.get("startsize");
  if (startSize !== undefined) style.set("endsize", startSize);
  else style.delete("endsize");
  if (endSize !== undefined) style.set("startsize", endSize);
  else style.delete("startsize");
}
