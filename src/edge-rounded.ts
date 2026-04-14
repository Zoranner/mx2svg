/**
 * 正交折线边的圆角：`rounded=1` 且至少 3 个路点时，与 draw.io mxShape.addPoints 一致的 L + Q 路径。
 */

import { type CurvePoint, curvedEdgeToPolylineApprox, isCurvedEdgeStyle } from "./edge-curve.ts";

export function isEdgeRoundedOrthogonalStyle(style: Map<string, string>): boolean {
  const r = style.get("rounded");
  if (r === "0" || r === "false") return false;
  return r === "1" || r === "true";
}

/** draw.io `arcSize`（LINE_ARCSIZE）；传入 `buildRoundedOrthogonalPathD` 后会除以 2 与参考实现一致。 */
export function edgeRoundedArcSizeFromStyle(style: Map<string, string>): number | undefined {
  const raw = style.get("arcsize");
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function buildRoundedOrthogonalPathD(
  points: CurvePoint[],
  arcSizeOverride?: number,
): string {
  const arcSize = arcSizeOverride != null ? arcSizeOverride / 2 : 10;
  const pts = points;
  const round2 = (value: number): number => Number(value.toFixed(2));

  if (pts.length === 0) return "";

  let pathD = `M ${round2(pts[0].x)} ${round2(pts[0].y)}`;
  let pt = pts[0];
  let i = 1;

  while (i < pts.length - 1) {
    const tmp = pts[i];
    const dx = pt.x - tmp.x;
    const dy = pt.y - tmp.y;

    if (dx !== 0 || dy !== 0) {
      let next = pts[i + 1];
      let nextIdx = i + 1;
      while (
        nextIdx < pts.length - 1 &&
        Math.round(next.x - tmp.x) === 0 &&
        Math.round(next.y - tmp.y) === 0
      ) {
        nextIdx++;
        next = pts[nextIdx];
        i++;
      }

      const dx2 = next.x - tmp.x;
      const dy2 = next.y - tmp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx1 = (dx * Math.min(arcSize, dist / 2)) / dist;
      const ny1 = (dy * Math.min(arcSize, dist / 2)) / dist;

      const x1 = round2(tmp.x + nx1);
      const y1 = round2(tmp.y + ny1);
      pathD += ` L ${x1} ${y1}`;

      const dist2 = Math.max(1, Math.sqrt(dx2 * dx2 + dy2 * dy2));
      const nx2 = (dx2 * Math.min(arcSize, dist2 / 2)) / dist2;
      const ny2 = (dy2 * Math.min(arcSize, dist2 / 2)) / dist2;

      const x2 = round2(tmp.x + nx2);
      const y2 = round2(tmp.y + ny2);

      pathD += ` Q ${round2(tmp.x)} ${round2(tmp.y)} ${x2} ${y2}`;
      pt = { x: x2, y: y2 };
    } else {
      pathD += ` L ${round2(tmp.x)} ${round2(tmp.y)}`;
      pt = tmp;
    }

    i++;
  }

  const pe = pts[pts.length - 1];
  pathD += ` L ${round2(pe.x)} ${round2(pe.y)}`;

  return pathD;
}

function quadPoint(p0: CurvePoint, p1: CurvePoint, p2: CurvePoint, t: number): CurvePoint {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function pushPt(out: CurvePoint[], p: CurvePoint): void {
  const prev = out[out.length - 1];
  if (!prev || Math.abs(prev.x - p.x) > 1e-6 || Math.abs(prev.y - p.y) > 1e-6) {
    out.push(p);
  }
}

/**
 * 圆角正交路径密化为折线，供弧长 / 法向标签与 viewBox（与 `buildRoundedOrthogonalPathD` 几何一致）。
 */
export function roundedOrthogonalToPolylineApprox(
  points: CurvePoint[],
  arcSizeOverride?: number,
  samplesPerQuad = 10,
): CurvePoint[] {
  const arcSize = arcSizeOverride != null ? arcSizeOverride / 2 : 10;
  const pts = points;
  if (pts.length === 0) return [];

  const out: CurvePoint[] = [{ x: pts[0].x, y: pts[0].y }];
  let pt = pts[0];
  let i = 1;

  while (i < pts.length - 1) {
    const tmp = pts[i];
    const dx = pt.x - tmp.x;
    const dy = pt.y - tmp.y;

    if (dx !== 0 || dy !== 0) {
      let next = pts[i + 1];
      let nextIdx = i + 1;
      while (
        nextIdx < pts.length - 1 &&
        Math.round(next.x - tmp.x) === 0 &&
        Math.round(next.y - tmp.y) === 0
      ) {
        nextIdx++;
        next = pts[nextIdx];
        i++;
      }

      const dx2 = next.x - tmp.x;
      const dy2 = next.y - tmp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx1 = (dx * Math.min(arcSize, dist / 2)) / dist;
      const ny1 = (dy * Math.min(arcSize, dist / 2)) / dist;
      const x1 = tmp.x + nx1;
      const y1 = tmp.y + ny1;

      pushPt(out, { x: x1, y: y1 });

      const dist2 = Math.max(1, Math.sqrt(dx2 * dx2 + dy2 * dy2));
      const nx2 = (dx2 * Math.min(arcSize, dist2 / 2)) / dist2;
      const ny2 = (dy2 * Math.min(arcSize, dist2 / 2)) / dist2;
      const x2 = tmp.x + nx2;
      const y2 = tmp.y + ny2;

      const pStart = out[out.length - 1];
      for (let s = 1; s <= samplesPerQuad; s++) {
        const t = s / samplesPerQuad;
        pushPt(out, quadPoint(pStart, tmp, { x: x2, y: y2 }, t));
      }
      pt = { x: x2, y: y2 };
    } else {
      pushPt(out, tmp);
      pt = tmp;
    }
    i++;
  }

  const pe = pts[pts.length - 1];
  pushPt(out, pe);
  return out;
}

/** 用于标签锚点、包围盒：曲线 / 圆角边用近似折线，其余用原始路点。 */
export function edgePolylineForLengthAndBounds(
  points: CurvePoint[],
  style: Map<string, string>,
): CurvePoint[] {
  if (isCurvedEdgeStyle(style)) {
    return curvedEdgeToPolylineApprox(points);
  }
  if (isEdgeRoundedOrthogonalStyle(style) && points.length > 2) {
    return roundedOrthogonalToPolylineApprox(points, edgeRoundedArcSizeFromStyle(style));
  }
  return points;
}

export function useRoundedOrthogonalPath(style: Map<string, string>, pointCount: number): boolean {
  return !isCurvedEdgeStyle(style) && isEdgeRoundedOrthogonalStyle(style) && pointCount > 2;
}
