/** 折线几何（边路由），供解析与渲染共用。 */

export function polylinePointAtLengthFraction(
  points: { x: number; y: number }[],
  fraction: number,
): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const segs: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    segs.push(Math.hypot(dx, dy));
  }
  const total = segs.reduce((a, b) => a + b, 0);
  if (total <= 0) return points[0];
  let dist = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < segs.length; i++) {
    const sl = segs[i];
    if (dist <= sl) {
      const t = sl <= 0 ? 0 : dist / sl;
      return {
        x: points[i].x + t * (points[i + 1].x - points[i].x),
        y: points[i].y + t * (points[i + 1].y - points[i].y),
      };
    }
    dist -= sl;
  }
  return points[points.length - 1];
}

/**
 * 在总长 `fraction` 处沿路径法向偏移 `offsetPx`（像素）。
 * 法向取路径前进方向的左侧（SVG y 向下时，水平向右的边「上方」为负 y）。
 */
export function polylinePointWithPerpendicularOffset(
  points: { x: number; y: number }[],
  fraction: number,
  offsetPx: number,
): { x: number; y: number } {
  const p = polylinePointAtLengthFraction(points, fraction);
  const eps = 0.02;
  let p2 = polylinePointAtLengthFraction(points, Math.min(1, fraction + eps));
  let dx = p2.x - p.x;
  let dy = p2.y - p.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    const p0 = polylinePointAtLengthFraction(points, Math.max(0, fraction - eps));
    dx = p.x - p0.x;
    dy = p.y - p0.y;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  return { x: p.x - dy * offsetPx, y: p.y + dx * offsetPx };
}
