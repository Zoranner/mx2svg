import type { DiagramNode } from "../core/model.ts";
import { documentWaveDy } from "./shape-path.ts";

/** 与 `shape-path.ts` 中路径一致、用于 **`spacing`** 射线与周界求交的密化折线（闭合，不重复首点）。 */
const CURVE_STEPS = 10;
const ARC_STEPS = 16;

type Pt = { x: number; y: number };

function transformPerimeterPoint(p: Pt, n: DiagramNode): Pt {
  if (n.rotation === 0) return p;
  const rcx = n.x + n.width / 2;
  const rcy = n.y + n.height / 2;
  const dx = p.x - rcx;
  const dy = p.y - rcy;
  const rad = (n.rotation * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: rcx + dx * c - dy * s, y: rcy + dx * s + dy * c };
}

function sampleCubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const u2 = u * u;
    const u3 = u2 * u;
    const t2 = t * t;
    const t3 = t2 * t;
    out.push({
      x: u3 * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t3 * p3.x,
      y: u3 * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t3 * p3.y,
    });
  }
  return out;
}

function sampleQuad(p0: Pt, p1: Pt, p2: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    });
  }
  return out;
}

function cloudPerimeterAxisAligned(x: number, y: number, w: number, h: number): Pt[] {
  const X = (fx: number, fy: number): Pt => ({ x: x + fx * w, y: y + fy * h });
  const p0 = X(0.25, 0.25);
  const segs: [Pt, Pt, Pt][] = [
    [X(0.05, 0.25), X(0, 0.5), X(0.16, 0.55)],
    [X(0, 0.66), X(0.18, 0.9), X(0.31, 0.8)],
    [X(0.4, 1), X(0.7, 1), X(0.8, 0.8)],
    [X(1, 0.8), X(1, 0.6), X(0.875, 0.5)],
    [X(1, 0.3), X(0.8, 0.1), X(0.625, 0.2)],
    [X(0.5, 0.05), X(0.3, 0.05), X(0.25, 0.25)],
  ];
  const pts: Pt[] = [p0];
  let start = p0;
  for (const [c1, c2, end] of segs) {
    for (const q of sampleCubic(start, c1, c2, end, CURVE_STEPS)) pts.push(q);
    start = end;
  }
  if (pts.length > 1) pts.pop();
  return pts;
}

function cylinderPerimeterAxisAligned(x: number, y: number, w: number, h: number): Pt[] {
  const rx = w / 2;
  const ry = Math.min(Math.max(h * 0.08, 3), h * 0.22);
  const cx = x + rx;
  const rimY = y + ry;
  const pts: Pt[] = [
    { x, y: rimY },
    { x, y: y + h },
    { x: x + w, y: y + h },
    { x: x + w, y: rimY },
  ];
  for (let i = 1; i < ARC_STEPS; i++) {
    const theta = (i / ARC_STEPS) * Math.PI;
    pts.push({ x: cx + rx * Math.cos(theta), y: rimY - ry * Math.sin(theta) });
  }
  return pts;
}

function documentPerimeterAxisAligned(
  x: number,
  y: number,
  w: number,
  h: number,
  style: Map<string, string>,
): Pt[] {
  const dy = documentWaveDy(h, style);
  const fy = 1.4;
  const pts: Pt[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h - dy / 2 },
  ];
  for (const q of sampleQuad(
    { x: x + w, y: y + h - dy / 2 },
    { x: x + (w * 3) / 4, y: y + h - dy * fy },
    { x: x + w / 2, y: y + h - dy / 2 },
    CURVE_STEPS,
  )) {
    pts.push(q);
  }
  for (const q of sampleQuad(
    { x: x + w / 2, y: y + h - dy / 2 },
    { x: x + w / 4, y: y + h - dy * (1 - fy) },
    { x, y: y + h - dy / 2 },
    CURVE_STEPS,
  )) {
    pts.push(q);
  }
  pts.push({ x, y: y + dy / 2 });
  return pts;
}

function dataStoragePerimeterAxisAligned(
  x: number,
  y: number,
  w: number,
  h: number,
  style: Map<string, string>,
): Pt[] {
  const fixed = style.get("fixedsize") === "1" || style.get("fixedsize") === "true";
  const defaultFrac = 0.1;
  const fixedDefaultPx = 10;
  let s: number;
  if (fixed) {
    const raw = style.get("size");
    s = Math.max(0, Math.min(w, Number(raw) || fixedDefaultPx));
  } else {
    const raw = style.get("size");
    const frac = Number(raw);
    s = w * Math.max(0, Math.min(1, Number.isFinite(frac) ? frac : defaultFrac));
  }
  const x0 = x + s;
  const pts: Pt[] = [
    { x: x0, y },
    { x: x + w, y },
  ];
  for (const q of sampleQuad(
    { x: x + w, y },
    { x: x + w - 2 * s, y: y + h / 2 },
    { x: x + w, y: y + h },
    CURVE_STEPS,
  )) {
    pts.push(q);
  }
  pts.push({ x: x0, y: y + h });
  for (const q of sampleQuad(
    { x: x0, y: y + h },
    { x: x0 - 2 * s, y: y + h / 2 },
    { x: x0, y },
    CURVE_STEPS,
  )) {
    pts.push(q);
  }
  const a = pts[0];
  const b = pts[pts.length - 1];
  if (pts.length > 1 && Math.hypot(a.x - b.x, a.y - b.y) < 1e-6) pts.pop();
  return pts;
}

function axisAlignedPolyline(n: DiagramNode): Pt[] | null {
  const { x, y, width: w, height: h, style } = n;
  switch (n.shape) {
    case "cloud":
      return cloudPerimeterAxisAligned(x, y, w, h);
    case "cylinder":
      return cylinderPerimeterAxisAligned(x, y, w, h);
    case "document":
      return documentPerimeterAxisAligned(x, y, w, h, style);
    case "dataStorage":
      return dataStoragePerimeterAxisAligned(x, y, w, h, style);
    default:
      return null;
  }
}

/**
 * 页面坐标下、与 **`shapePathD`** 轮廓一致的闭合折线近似（用于 **`spacing`** 穿出周界）。
 * **`rect` / `ellipse` / 凸多边形** 等返回 **`null`**，由 **`edge-endpoint-spacing`** 既有分支处理。
 */
export function worldShapePerimeterPolyline(n: DiagramNode): { x: number; y: number }[] | null {
  const local = axisAlignedPolyline(n);
  if (!local || local.length < 3) return null;
  return local.map((p) => transformPerimeterPoint(p, n));
}
