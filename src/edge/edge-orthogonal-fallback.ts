/** 无显式路点时，将「两中心/间距端点」连线改为直角折线，贴近 draw.io 的 orthogonalEdgeStyle。 */

export function styleIsOrthogonalEdge(style: Map<string, string>): boolean {
  const es = (style.get("edgestyle") ?? "").toLowerCase();
  return es.includes("orthogonal");
}

/**
 * 单拐点曼哈顿路径：`|dx| >= |dy|` 时先水平再垂直，否则先垂直再水平。
 * 输入已为2 点（通常为间距修正后的端点）。
 */
export function orthogonalizeTwoPointPolyline(
  pts: { x: number; y: number }[],
): { x: number; y: number }[] {
  if (pts.length !== 2) return pts;
  const p0 = pts[0]!;
  const p1 = pts[1]!;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  if (dx === 0 || dy === 0) return pts;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return [p0, { x: p1.x, y: p0.y }, p1];
  }
  return [p0, { x: p0.x, y: p1.y }, p1];
}
