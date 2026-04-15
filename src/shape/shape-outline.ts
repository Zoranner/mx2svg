import type { DiagramNode, NodeShape } from "../core/model.ts";
import { stepSkewPx } from "./shape-path.ts";

/**
 * 与 `shape-path.ts` 一致、相对 **单元格中心** 的凸多边形顶点（逆时针顺序），用于 `spacing` 等周界求交。
 * 非凸多边形 / 曲线轮廓返回 `null`，调用方回退到外接矩形。
 */
export function localConvexPolygonOffsets(
  shape: NodeShape,
  w: number,
  h: number,
  style: Map<string, string>,
): { x: number; y: number }[] | null {
  const hw = w / 2;
  const hh = h / 2;
  switch (shape) {
    case "rhombus":
      return [
        { x: 0, y: -hh },
        { x: hw, y: 0 },
        { x: 0, y: hh },
        { x: -hw, y: 0 },
      ];
    case "hexagon": {
      const inset = w * 0.25;
      return [
        { x: inset - hw, y: -hh },
        { x: hw - inset, y: -hh },
        { x: hw, y: 0 },
        { x: hw - inset, y: hh },
        { x: inset - hw, y: hh },
        { x: -hw, y: 0 },
      ];
    }
    case "parallelogram": {
      const skew = Math.min(w * 0.25, h * 0.5);
      return [
        { x: skew - hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw - skew, y: hh },
        { x: -hw, y: hh },
      ];
    }
    case "triangle": {
      const dir = (style.get("direction") ?? "north").toLowerCase();
      if (dir === "south") {
        return [
          { x: -hw, y: -hh },
          { x: hw, y: -hh },
          { x: 0, y: hh },
        ];
      }
      if (dir === "east") {
        return [
          { x: -hw, y: -hh },
          { x: hw, y: 0 },
          { x: -hw, y: hh },
        ];
      }
      if (dir === "west") {
        return [
          { x: hw, y: -hh },
          { x: -hw, y: 0 },
          { x: hw, y: hh },
        ];
      }
      return [
        { x: 0, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh },
      ];
    }
    case "trapezoid": {
      const inset = w * 0.15;
      return [
        { x: inset - hw, y: -hh },
        { x: hw - inset, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh },
      ];
    }
    case "step": {
      const sk = stepSkewPx(w, h);
      return [
        { x: sk - hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh },
      ];
    }
    case "pentagon": {
      const rx = w * 0.45;
      const ry = h * 0.45;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 5; i++) {
        const theta = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        pts.push({ x: rx * Math.cos(theta), y: ry * Math.sin(theta) });
      }
      return pts;
    }
    default:
      return null;
  }
}

function localOffsetToWorld(v: { x: number; y: number }, n: DiagramNode): { x: number; y: number } {
  const rcx = n.x + n.width / 2;
  const rcy = n.y + n.height / 2;
  if (n.rotation === 0) {
    return { x: rcx + v.x, y: rcy + v.y };
  }
  const r = (n.rotation * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: rcx + v.x * c - v.y * s, y: rcy + v.x * s + v.y * c };
}

/** 页面坐标系下的凸包络折线顶点（闭合，不重复首点）。 */
export function worldConvexPolygonOutline(n: DiagramNode): { x: number; y: number }[] | null {
  const local = localConvexPolygonOffsets(n.shape, n.width, n.height, n.style);
  if (!local) return null;
  return local.map((v) => localOffsetToWorld(v, n));
}
