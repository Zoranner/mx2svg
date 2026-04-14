/**
 * 曲线边：`curved=1` 时与 draw.io mxPolyline.paintCurvedLine 相同的二次贝塞尔分段（参见 drawio2svg path-builder）。
 */

export type CurvePoint = { x: number; y: number };

export function isCurvedEdgeStyle(style: Map<string, string>): boolean {
  const c = style.get("curved");
  return c === "1" || c === "true";
}

function quadPoint(p0: CurvePoint, p1: CurvePoint, p2: CurvePoint, t: number): CurvePoint {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** 与 buildEdgePath(curved) 一致的分段列表，用于密化折线（标签锚点、包围盒）。 */
export function curvedEdgeSegments(
  points: CurvePoint[],
): { p0: CurvePoint; p1: CurvePoint; p2: CurvePoint }[] {
  const n = points.length;
  if (n < 2) return [];
  if (n === 2) {
    const [a, b] = points;
    return [{ p0: a, p1: a, p2: b }];
  }
  const segs: { p0: CurvePoint; p1: CurvePoint; p2: CurvePoint }[] = [];
  let current = points[0];
  for (let i = 1; i < n - 2; i++) {
    const cp = points[i];
    const np = points[i + 1];
    const mid = { x: (cp.x + np.x) / 2, y: (cp.y + np.y) / 2 };
    segs.push({ p0: current, p1: cp, p2: mid });
    current = mid;
  }
  segs.push({ p0: current, p1: points[n - 2], p2: points[n - 1] });
  return segs;
}

/** SVG path `d`（仅曲线模式；点数少于 2 返回空串）。 */
export function buildCurvedEdgePathD(points: CurvePoint[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    const [p0, p1] = points;
    return `M ${p0.x} ${p0.y} Q ${p0.x} ${p0.y} ${p1.x} ${p1.y}`;
  }
  const n = points.length;
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < n - 2; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const ix = (p0.x + p1.x) / 2;
    const iy = (p0.y + p1.y) / 2;
    pathD += ` Q ${p0.x} ${p0.y} ${ix} ${iy}`;
  }
  const pa = points[n - 2];
  const pb = points[n - 1];
  pathD += ` Q ${pa.x} ${pa.y} ${pb.x} ${pb.y}`;
  return pathD;
}

/**
 * 将曲线边近似为折线，供弧长比例、法向偏移与 viewBox 扩展。
 * `samplesPerSegment`：每段二次曲线上的采样数（含端点间步进）。
 */
export function curvedEdgeToPolylineApprox(
  points: CurvePoint[],
  samplesPerSegment = 12,
): CurvePoint[] {
  const segs = curvedEdgeSegments(points);
  if (segs.length === 0) return [];
  const out: CurvePoint[] = [];
  for (const seg of segs) {
    for (let s = 0; s <= samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const pt = quadPoint(seg.p0, seg.p1, seg.p2, t);
      const prev = out[out.length - 1];
      if (!prev || Math.abs(prev.x - pt.x) > 1e-6 || Math.abs(prev.y - pt.y) > 1e-6) {
        out.push(pt);
      }
    }
  }
  return out;
}
