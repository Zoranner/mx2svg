import type { DiagramNode } from "../core/model.ts";
import { worldConvexPolygonOutline } from "../shape/shape-outline.ts";
import { worldShapePerimeterPolyline } from "../shape/shape-perimeter-polyline.ts";

/**
 * `spacing` 样式：在「仅有源/目标中心点」的边上，将端点从中心改为沿指向对端的射线穿出本形状周界，再沿连线偏移 `spacing`（像素），
 * 与 draw.io / mxGraph 常见导出一致。显式 `sourcePoint`/`targetPoint` 的边不调用。
 */

function unit(dx: number, dy: number): { x: number; y: number } | null {
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  return { x: dx / len, y: dy / len };
}

/** 世界坐标下的方向向量 → 与 `worldToLocalCentered` 同角的逆旋转（用于射线方向）。 */
function worldDirToLocalCentered(
  d: { x: number; y: number },
  n: DiagramNode,
): { x: number; y: number } {
  const rad = (-n.rotation * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: d.x * c - d.y * s, y: d.x * s + d.y * c };
}

/** 页面坐标 → 以单元格中心为原点、逆旋转后的局部坐标（y 向下，矩形为 [-w/2,w/2]×[-h/2,h/2]）。 */
function worldToLocalCentered(
  p: { x: number; y: number },
  n: DiagramNode,
): { x: number; y: number } {
  const rcx = n.x + n.width / 2;
  const rcy = n.y + n.height / 2;
  const rad = (-n.rotation * Math.PI) / 180;
  const dx = p.x - rcx;
  const dy = p.y - rcy;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

/**
 * 射线 origin + t * dir（dir 为单位向量）与开线段 a—b 的首次交点距离 t>0。
 */
function rayUnitSegmentMinT(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number | null {
  const wx = bx - ax;
  const wy = by - ay;
  const cross = dx * wy - dy * wx;
  if (Math.abs(cross) < 1e-12) return null;
  const t = ((ax - ox) * wy - (ay - oy) * wx) / cross;
  const u = ((ax - ox) * dy - (ay - oy) * dx) / cross;
  if (t <= 1e-9 || u < -1e-8 || u > 1 + 1e-8) return null;
  return t;
}

/** 射线与轴对齐矩形边界的首个正交距离（dir 单位向量）。 */
function rectRayDistance(
  from: { x: number; y: number },
  dir: { x: number; y: number },
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): number | null {
  const x0 = rx;
  const y0 = ry;
  const x1 = rx + rw;
  const y1 = ry + rh;
  let best: number | null = null;
  const tryT = (t: number) => {
    if (!Number.isFinite(t) || t <= 1e-9) return;
    const px = from.x + t * dir.x;
    const py = from.y + t * dir.y;
    const onVert =
      (Math.abs(px - x0) < 1e-4 || Math.abs(px - x1) < 1e-4) && py >= y0 - 1e-4 && py <= y1 + 1e-4;
    const onHorz =
      (Math.abs(py - y0) < 1e-4 || Math.abs(py - y1) < 1e-4) && px >= x0 - 1e-4 && px <= x1 + 1e-4;
    if ((onVert || onHorz) && (best === null || t < best)) best = t;
  };
  if (Math.abs(dir.x) > 1e-12) {
    tryT((x0 - from.x) / dir.x);
    tryT((x1 - from.x) / dir.x);
  }
  if (Math.abs(dir.y) > 1e-12) {
    tryT((y0 - from.y) / dir.y);
    tryT((y1 - from.y) / dir.y);
  }
  return best;
}

function polygonRayMinDistance(
  from: { x: number; y: number },
  dir: { x: number; y: number },
  verts: { x: number; y: number }[],
): number | null {
  if (verts.length < 3) return null;
  let best: number | null = null;
  const nv = verts.length;
  for (let i = 0; i < nv; i++) {
    const a = verts[i]!;
    const b = verts[(i + 1) % nv]!;
    const t = rayUnitSegmentMinT(from.x, from.y, dir.x, dir.y, a.x, a.y, b.x, b.y);
    if (t != null && (best === null || t < best)) best = t;
  }
  return best;
}

/** 局部中心系下椭圆 (x/rx)²+(y/ry)²=1 与射线 fromL + s*dirL（dirL 单位）的最小正根 s。 */
function ellipseRayMinDistanceLocal(
  fromL: { x: number; y: number },
  dirL: { x: number; y: number },
  rx: number,
  ry: number,
): number | null {
  if (rx < 1e-9 || ry < 1e-9) return null;
  const px = fromL.x;
  const py = fromL.y;
  const dx = dirL.x;
  const dy = dirL.y;
  const A = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  const B = 2 * ((px * dx) / (rx * rx) + (py * dy) / (ry * ry));
  const C = (px * px) / (rx * rx) + (py * py) / (ry * ry) - 1;
  if (Math.abs(A) < 1e-12) {
    if (Math.abs(B) < 1e-12) return null;
    const s = -C / B;
    return s > 1e-9 ? s : null;
  }
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const sDisc = Math.sqrt(disc);
  let best: number | null = null;
  for (const s of [(-B - sDisc) / (2 * A), (-B + sDisc) / (2 * A)]) {
    if (s > 1e-9 && (best === null || s < best)) best = s;
  }
  return best;
}

/**
 * 从 `from` 沿单位方向 `dir` 发出射线，到形状周界的最短正距离（首次穿出）。
 * 解决「比例点在形状内部」时限在 (0,1] 弦长无法到达边界的问题（云形、圆角块等）。
 */
export function perimeterRayDistance(
  from: { x: number; y: number },
  dir: { x: number; y: number },
  n: DiagramNode,
): number | null {
  if (n.shape === "ellipse") {
    const fromL = worldToLocalCentered(from, n);
    const dirL = worldDirToLocalCentered(dir, n);
    return ellipseRayMinDistanceLocal(fromL, dirL, n.width / 2, n.height / 2);
  }

  const poly = worldConvexPolygonOutline(n);
  if (poly) {
    const t = polygonRayMinDistance(from, dir, poly);
    if (t != null) return t;
  }

  const curved = worldShapePerimeterPolyline(n);
  if (curved && curved.length >= 3) {
    const t = polygonRayMinDistance(from, dir, curved);
    if (t != null) return t;
  }

  if (n.rotation !== 0) {
    const fromL = worldToLocalCentered(from, n);
    const dirL = worldDirToLocalCentered(dir, n);
    return rectRayDistance(fromL, dirL, -n.width / 2, -n.height / 2, n.width, n.height);
  }
  return rectRayDistance(from, dir, n.x, n.y, n.width, n.height);
}

export function perimeterPointFromCenterToward(
  n: DiagramNode,
  toward: { x: number; y: number },
): { x: number; y: number } {
  const cx = n.x + n.width / 2;
  const cy = n.y + n.height / 2;
  const u = unit(toward.x - cx, toward.y - cy);
  if (!u) return { x: cx, y: cy };
  const s = perimeterRayDistance({ x: cx, y: cy }, u, n);
  if (s == null) return { x: cx, y: cy };
  return { x: cx + s * u.x, y: cy + s * u.y };
}

/**
 * draw.io `exitX`/`exitY`/`entryX`/`entryY`：相对单元包围盒的比例点（左上为原点）。
 * 从形状中心朝该点方向射线，取与真实周界（椭圆/云形多段线/矩形等）的交点。
 */
export function shapeAnchorFromRatios(
  n: DiagramNode,
  relX: number,
  relY: number,
): { x: number; y: number } {
  const toward = {
    x: n.x + relX * n.width,
    y: n.y + relY * n.height,
  };
  return perimeterPointFromCenterToward(n, toward);
}

/**
 * `pts` 为 [源中心, 目标中心]；返回调整后的两点，失败则 `null`。
 */
export function adjustCenterConnectorEndpoints(
  cA: { x: number; y: number },
  cB: { x: number; y: number },
  nodeA: DiagramNode,
  nodeB: DiagramNode,
  spacing: number,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  if (!(spacing > 0) || !Number.isFinite(spacing)) return null;

  const u = unit(cB.x - cA.x, cB.y - cA.y);
  if (!u) return null;

  const sA = perimeterRayDistance(cA, u, nodeA);
  const sB = perimeterRayDistance(cB, { x: -u.x, y: -u.y }, nodeB);
  if (sA == null || sB == null) return null;

  const E_A = { x: cA.x + sA * u.x, y: cA.y + sA * u.y };
  const E_B = { x: cB.x - sB * u.x, y: cB.y - sB * u.y };

  const start = { x: E_A.x + spacing * u.x, y: E_A.y + spacing * u.y };
  const end = { x: E_B.x - spacing * u.x, y: E_B.y - spacing * u.y };

  const segLen = Math.hypot(end.x - start.x, end.y - start.y);
  if (segLen < 1e-3) return null;

  return [start, end];
}
