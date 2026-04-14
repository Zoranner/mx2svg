/**
 * 边交叉跳线：与 draw.io `Graph.js` 中 `mxConnector.prototype.paintLine` 一致，
 * 支持 `jumpStyle`：`arc`、`line`、`sharp`、`gap`（`curved=1` 或 `noJump=1` 时不启用）。
 */

import type { CurvePoint } from "./edge-curve.ts";
import { isCurvedEdgeStyle } from "./edge-curve.ts";

export type EdgeWaypointRef = {
  id: string;
  points: CurvePoint[];
  style: Map<string, string>;
};

export type JumpStyleKind = "none" | "arc" | "line" | "sharp" | "gap";

/** 与 draw.io 格式面板中 `lineJumps` 选项一致：`none` | `arc` | `gap` | `sharp` | `line`。 */
export function jumpStyleFromStyle(style: Map<string, string>): JumpStyleKind {
  const js = (style.get("jumpstyle") ?? "none").toLowerCase().trim();
  if (js === "arc" || js === "line" || js === "sharp" || js === "gap") return js;
  return "none";
}

export function isJumpStyleEnabled(style: Map<string, string>): boolean {
  if (isCurvedEdgeStyle(style)) return false;
  const nj = style.get("nojump");
  if (nj === "1" || nj === "true") return false;
  if (jumpStyleFromStyle(style) === "none") return false;
  const raw = style.get("jumpsize");
  const jz = raw == null || raw === "" ? 6 : Number(raw);
  const jumpSize = Number.isFinite(jz) ? jz : 6;
  return jumpSize > 0;
}

function jumpSizeFromStyle(style: Map<string, string>): number {
  const raw = style.get("jumpsize");
  const jz = raw == null || raw === "" ? 6 : Number(raw);
  return Number.isFinite(jz) ? jz : 6;
}

function ptSegDistSq(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  px: number,
  py: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    const ddx = px - x1;
    const ddy = py - y1;
    return ddx * ddx + ddy * ddy;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const ddx = px - cx;
  const ddy = py - cy;
  return ddx * ddx + ddy * ddy;
}

function ptLineDist(a: CurvePoint, b: CurvePoint, p: CurvePoint): number {
  return Math.sqrt(ptSegDistSq(a.x, a.y, b.x, b.y, p.x, p.y));
}

function intersectSegments(
  a: CurvePoint,
  b: CurvePoint,
  c: CurvePoint,
  d: CurvePoint,
): CurvePoint | null {
  const s1x = b.x - a.x;
  const s1y = b.y - a.y;
  const s2x = d.x - c.x;
  const s2y = d.y - c.y;
  const denom = -s2x * s1y + s1x * s2y;
  if (Math.abs(denom) <= 1e-6) return null;
  const s = (-s1y * (a.x - c.x) + s1x * (a.y - c.y)) / denom;
  const t = (s2x * (a.y - c.y) - s2y * (a.x - c.x)) / denom;
  if (s < 0 || s > 1 || t < 0 || t > 1) return null;
  return { x: a.x + t * s1x, y: a.y + t * s1y };
}

function cubicPoint(
  p0: CurvePoint,
  p1: CurvePoint,
  p2: CurvePoint,
  p3: CurvePoint,
  t: number,
): CurvePoint {
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: u3 * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t3 * p3.x,
    y: u3 * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t3 * p3.y,
  };
}

function pushPt(out: CurvePoint[], p: CurvePoint): void {
  const prev = out[out.length - 1];
  if (!prev || Math.abs(prev.x - p.x) > 1e-6 || Math.abs(prev.y - p.y) > 1e-6) {
    out.push(p);
  }
}

/**
 * 与 draw.io collectJumpMap 等价：键为路点段索引，值为该段上按前进方向排序的交点。
 */
export function collectJumpMap(
  points: CurvePoint[],
  current: EdgeWaypointRef,
  all: EdgeWaypointRef[],
): Map<number, CurvePoint[]> {
  const jumpMap = new Map<number, CurvePoint[]>();
  if (!isJumpStyleEnabled(current.style) || points.length < 2) return jumpMap;

  const scale = 1;
  const endpointTol = 0.5 * scale;
  const mergeTolSq = scale * scale;

  for (let i = 0; i < points.length - 1; i++) {
    let start = points[i];
    let end = points[i + 1];
    let next = points[i + 2];
    while (
      i < points.length - 2 &&
      ptSegDistSq(start.x, start.y, next.x, next.y, end.x, end.y) < mergeTolSq
    ) {
      end = next;
      i++;
      next = points[i + 2];
    }

    const intersections: { distSq: number; pt: CurvePoint }[] = [];

    for (const other of all) {
      if (other.id === current.id) continue;
      const otherNoJump = other.style.get("nojump") === "1" || other.style.get("nojump") === "true";
      if (otherNoJump) continue;
      if (!other.points || other.points.length < 2) continue;

      let prevOtherStart: CurvePoint | null = null;
      for (let j = 0; j < other.points.length - 1; j++) {
        let otherStart = other.points[j];
        let otherEnd = other.points[j + 1];
        let otherNext = other.points[j + 2];
        while (
          j < other.points.length - 2 &&
          ptSegDistSq(
            otherStart.x,
            otherStart.y,
            otherNext.x,
            otherNext.y,
            otherEnd.x,
            otherEnd.y,
          ) < mergeTolSq
        ) {
          otherEnd = otherNext;
          j++;
          otherNext = other.points[j + 2];
        }

        const hit = intersectSegments(start, end, otherStart, otherEnd);
        if (hit) {
          const nearStart =
            Math.abs(hit.x - start.x) <= endpointTol && Math.abs(hit.y - start.y) <= endpointTol;
          const nearEnd =
            Math.abs(hit.x - end.x) <= endpointTol && Math.abs(hit.y - end.y) <= endpointTol;
          if (!nearStart && !nearEnd) {
            const prevTooClose =
              prevOtherStart != null
                ? ptLineDist(start, end, prevOtherStart) <= endpointTol &&
                  ptLineDist(start, end, otherStart) <= endpointTol
                : false;
            const nextTooClose =
              otherNext != null
                ? ptLineDist(start, end, otherNext) <= endpointTol &&
                  ptLineDist(start, end, otherEnd) <= endpointTol
                : false;
            if (!prevTooClose && !nextTooClose) {
              const dx = hit.x - start.x;
              const dy = hit.y - start.y;
              const distSq = dx * dx + dy * dy;
              let inserted = false;
              for (let k = 0; k < intersections.length; k++) {
                if (intersections[k].distSq > distSq) {
                  intersections.splice(k, 0, { distSq, pt: hit });
                  inserted = true;
                  break;
                }
              }
              if (!inserted) {
                const last = intersections[intersections.length - 1];
                if (!last || last.pt.x !== hit.x || last.pt.y !== hit.y) {
                  intersections.push({ distSq, pt: hit });
                }
              }
            }
          }
        }
        prevOtherStart = otherStart;
      }
    }

    if (intersections.length > 0) {
      jumpMap.set(
        i,
        intersections.map((it) => it.pt),
      );
    }
  }

  return jumpMap;
}

export interface JumpPathResult {
  d: string;
  polyline: CurvePoint[];
}

/**
 * 在路点折线上插入跳线；`strokeWidth` 用于与 draw.io 一致的
 * `(jumpSize - 2) / 2 + strokewidth`。
 */
export function buildJumpPathDAndPolyline(
  points: CurvePoint[],
  jumpMap: Map<number, CurvePoint[]>,
  style: Map<string, string>,
  strokeWidth: number,
): JumpPathResult | null {
  if (!isJumpStyleEnabled(style) || jumpMap.size === 0 || points.length < 2) return null;

  const jumpStyle = jumpStyleFromStyle(style);
  const jumpSize = jumpSizeFromStyle(style);
  const jumpOffset = Math.max(0, (jumpSize - 2) / 2 + strokeWidth);
  const round2 = (v: number) => Number(v.toFixed(2));

  let path = `M ${round2(points[0].x)} ${round2(points[0].y)}`;
  const poly: CurvePoint[] = [{ x: points[0].x, y: points[0].y }];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const jumps = jumpMap.get(i) ?? [];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);

    if (jumps.length === 0 || len <= 1e-6 || jumpOffset <= 0) {
      path += ` L ${round2(end.x)} ${round2(end.y)}`;
      pushPt(poly, end);
      continue;
    }

    const ux = dx / len;
    const uy = dy / len;
    const dirSign = Math.round(ux) < 0 || (Math.round(ux) === 0 && Math.round(uy) <= 0) ? 1 : -1;
    let currentDist = 0;

    for (const pt of jumps) {
      const proj = (pt.x - start.x) * ux + (pt.y - start.y) * uy;
      const jumpStartDist = proj - jumpOffset;
      const jumpEndDist = proj + jumpOffset;
      if (jumpStartDist < 0 || jumpEndDist > len) continue;
      if (jumpStartDist < currentDist - 1e-6) continue;

      const jumpStart = { x: start.x + ux * jumpStartDist, y: start.y + uy * jumpStartDist };
      const jumpEnd = { x: start.x + ux * jumpEndDist, y: start.y + uy * jumpEndDist };
      const nx = ux * jumpOffset;
      const ny = uy * jumpOffset;
      const f = dirSign;

      path += ` L ${round2(jumpStart.x)} ${round2(jumpStart.y)}`;

      if (jumpStyle === "arc") {
        const F = f * 1.3;
        const c1 = { x: jumpStart.x - ny * F, y: jumpStart.y + nx * F };
        const c2 = { x: jumpEnd.x - ny * F, y: jumpEnd.y + nx * F };
        path += ` C ${round2(c1.x)} ${round2(c1.y)} ${round2(c2.x)} ${round2(c2.y)} ${round2(jumpEnd.x)} ${round2(jumpEnd.y)}`;
        pushPt(poly, jumpStart);
        for (let s = 1; s <= 8; s++) {
          pushPt(poly, cubicPoint(jumpStart, c1, c2, jumpEnd, s / 8));
        }
      } else if (jumpStyle === "sharp") {
        const pA = { x: jumpStart.x - ny * f, y: jumpStart.y + nx * f };
        const pB = { x: jumpEnd.x - ny * f, y: jumpEnd.y + nx * f };
        path += ` L ${round2(pA.x)} ${round2(pA.y)}`;
        path += ` L ${round2(pB.x)} ${round2(pB.y)}`;
        path += ` L ${round2(jumpEnd.x)} ${round2(jumpEnd.y)}`;
        pushPt(poly, jumpStart);
        pushPt(poly, pA);
        pushPt(poly, pB);
        pushPt(poly, jumpEnd);
      } else if (jumpStyle === "line") {
        const s1 = { x: jumpStart.x + ny * f, y: jumpStart.y - nx * f };
        const s2 = { x: jumpStart.x - ny * f, y: jumpStart.y + nx * f };
        const s3 = { x: jumpEnd.x - ny * f, y: jumpEnd.y + nx * f };
        const s4 = { x: jumpEnd.x + ny * f, y: jumpEnd.y - nx * f };
        path += ` M ${round2(s1.x)} ${round2(s1.y)}`;
        path += ` L ${round2(s2.x)} ${round2(s2.y)}`;
        path += ` M ${round2(s3.x)} ${round2(s3.y)}`;
        path += ` L ${round2(s4.x)} ${round2(s4.y)}`;
        path += ` M ${round2(jumpEnd.x)} ${round2(jumpEnd.y)}`;
        pushPt(poly, jumpStart);
        pushPt(poly, s1);
        pushPt(poly, s2);
        pushPt(poly, s3);
        pushPt(poly, s4);
        pushPt(poly, jumpEnd);
      } else {
        /* gap */
        path += ` M ${round2(jumpEnd.x)} ${round2(jumpEnd.y)}`;
        pushPt(poly, jumpStart);
        pushPt(poly, jumpEnd);
      }

      currentDist = jumpEndDist;
    }

    path += ` L ${round2(end.x)} ${round2(end.y)}`;
    pushPt(poly, end);
  }

  return { d: path, polyline: poly };
}
