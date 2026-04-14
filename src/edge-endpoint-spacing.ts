import type { DiagramNode } from "./model.ts";

/**
 * `spacing` 样式：在「仅有源/目标中心点」的边上，将端点从中心改为沿指向对端的射线穿出本形状周界，再沿连线偏移 `spacing`（像素），
 * 与 draw.io / mxGraph 常见导出一致。显式 `sourcePoint`/`targetPoint` 的边不调用。
 */

function unit(dx: number, dy: number): { x: number; y: number } | null {
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  return { x: dx / len, y: dy / len };
}

/** 线段 from→toward（沿 toward 方向参数 t，取 (0,1] 内最先碰到矩形边）的 t；from 应在矩形内部。 */
function rectBoundaryExitT(
  from: { x: number; y: number },
  toward: { x: number; y: number },
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): number | null {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12) return null;
  const x0 = rx;
  const y0 = ry;
  const x1 = rx + rw;
  const y1 = ry + rh;
  let best: number | null = null;

  const tryT = (t: number) => {
    if (t <= 1e-9 || t > 1) return;
    const px = from.x + t * dx;
    const py = from.y + t * dy;
    if (px < x0 - 1e-4 || px > x1 + 1e-4 || py < y0 - 1e-4 || py > y1 + 1e-4) return;
    const onBorder =
      Math.abs(px - x0) < 1e-3 ||
      Math.abs(px - x1) < 1e-3 ||
      Math.abs(py - y0) < 1e-3 ||
      Math.abs(py - y1) < 1e-3;
    if (onBorder) {
      if (best === null || t < best) best = t;
    }
  };

  if (Math.abs(dx) > 1e-12) {
    tryT((x0 - from.x) / dx);
    tryT((x1 - from.x) / dx);
  }
  if (Math.abs(dy) > 1e-12) {
    tryT((y0 - from.y) / dy);
    tryT((y1 - from.y) / dy);
  }
  return best;
}

/** 未旋转椭圆边界：线段从 `from` 穿出 toward方向，取 (0,1] 内最小正根。 */
/** 页面坐标 → 以单元格中心为原点、逆旋转后的局部坐标（y 向下，矩形为 [-w/2,w/2]×[-h/2,h/2]）。 */
function worldToLocalCentered(p: { x: number; y: number }, n: DiagramNode): { x: number; y: number } {
  const rcx = n.x + n.width / 2;
  const rcy = n.y + n.height / 2;
  const rad = (-n.rotation * Math.PI) / 180;
  const dx = p.x - rcx;
  const dy = p.y - rcy;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

function ellipseBoundaryExitT(from: { x: number; y: number }, toward: { x: number; y: number }, n: DiagramNode): number | null {
  const cx = n.x + n.width / 2;
  const cy = n.y + n.height / 2;
  const rx = n.width / 2;
  const ry = n.height / 2;
  if (rx < 1e-9 || ry < 1e-9) return null;
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const px = from.x - cx;
  const py = from.y - cy;
  const A = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  const B = 2 * ((px * dx) / (rx * rx) + (py * dy) / (ry * ry));
  const C = (px * px) / (rx * rx) + (py * py) / (ry * ry) - 1;
  if (Math.abs(A) < 1e-12) return null;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t1 = (-B - s) / (2 * A);
  const t2 = (-B + s) / (2 * A);
  let best: number | null = null;
  for (const t of [t1, t2]) {
    if (t > 1e-9 && t <= 1) {
      if (best === null || t < best) best = t;
    }
  }
  return best;
}

function perimeterExitT(from: { x: number; y: number }, toward: { x: number; y: number }, n: DiagramNode): number | null {
  if (n.rotation !== 0) {
    if (n.shape === "ellipse") {
      return rectBoundaryExitT(from, toward, n.x, n.y, n.width, n.height);
    }
    const fromL = worldToLocalCentered(from, n);
    const towardL = worldToLocalCentered(toward, n);
    return rectBoundaryExitT(fromL, towardL, -n.width / 2, -n.height / 2, n.width, n.height);
  }
  if (n.shape === "ellipse") {
    return ellipseBoundaryExitT(from, toward, n);
  }
  return rectBoundaryExitT(from, toward, n.x, n.y, n.width, n.height);
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

  const tA = perimeterExitT(cA, cB, nodeA);
  const tB = perimeterExitT(cB, cA, nodeB);
  if (tA == null || tB == null) return null;

  const E_A = { x: cA.x + tA * (cB.x - cA.x), y: cA.y + tA * (cB.y - cA.y) };
  const E_B = { x: cB.x + tB * (cA.x - cB.x), y: cB.y + tB * (cA.y - cB.y) };

  const u = unit(cB.x - cA.x, cB.y - cA.y);
  if (!u) return null;

  const start = { x: E_A.x + spacing * u.x, y: E_A.y + spacing * u.y };
  const end = { x: E_B.x - spacing * u.x, y: E_B.y - spacing * u.y };

  const segLen = Math.hypot(end.x - start.x, end.y - start.y);
  if (segLen < 1e-3) return null;

  return [start, end];
}
