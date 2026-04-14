import type { NodeShape } from "./model.ts";

/** 与 bbox 对齐的简单 path（绝对坐标），供 `shape=*` 顶点填充与描边。 */
export function shapePathD(
  shape: NodeShape,
  x: number,
  y: number,
  w: number,
  h: number,
  style?: Map<string, string>,
): string | null {
  switch (shape) {
    case "rect":
    case "ellipse":
      return null;
    case "rhombus": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return `M ${cx} ${y} L ${x + w} ${cy} L ${cx} ${y + h} L ${x} ${cy} Z`;
    }
    case "hexagon": {
      const inset = w * 0.25;
      return `M ${x + inset} ${y} L ${x + w - inset} ${y} L ${x + w} ${y + h / 2} L ${x + w - inset} ${y + h} L ${x + inset} ${y + h} L ${x} ${y + h / 2} Z`;
    }
    case "parallelogram": {
      const skew = Math.min(w * 0.25, h * 0.5);
      return `M ${x + skew} ${y} L ${x + w} ${y} L ${x + w - skew} ${y + h} L ${x} ${y + h} Z`;
    }
    case "cylinder": {
      const rx = w / 2;
      const ry = Math.min(Math.max(h * 0.08, 3), h * 0.22);
      return `M ${x} ${y + ry} L ${x} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y + ry} A ${rx} ${ry} 0 0 0 ${x} ${y + ry} Z`;
    }
    case "triangle": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const dir = (style?.get("direction") ?? "north").toLowerCase();
      if (dir === "south") {
        return `M ${x} ${y} L ${x + w} ${y} L ${cx} ${y + h} Z`;
      }
      if (dir === "east") {
        return `M ${x} ${y} L ${x + w} ${cy} L ${x} ${y + h} Z`;
      }
      if (dir === "west") {
        return `M ${x + w} ${y} L ${x} ${cy} L ${x + w} ${y + h} Z`;
      }
      return `M ${cx} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
    }
    case "trapezoid": {
      const inset = w * 0.15;
      return `M ${x + inset} ${y} L ${x + w - inset} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
    }
    /** ER/流程图云：与 draw.io `mxgraph.er.cloud` 背景曲线一致（相对宽高的控制点）。 */
    case "cloud": {
      const X = (fx: number, fy: number) => `${x + fx * w} ${y + fy * h}`;
      return (
        `M ${X(0.25, 0.25)}` +
        ` C ${X(0.05, 0.25)} ${X(0, 0.5)} ${X(0.16, 0.55)}` +
        ` C ${X(0, 0.66)} ${X(0.18, 0.9)} ${X(0.31, 0.8)}` +
        ` C ${X(0.4, 1)} ${X(0.7, 1)} ${X(0.8, 0.8)}` +
        ` C ${X(1, 0.8)} ${X(1, 0.6)} ${X(0.875, 0.5)}` +
        ` C ${X(1, 0.3)} ${X(0.8, 0.1)} ${X(0.625, 0.2)}` +
        ` C ${X(0.5, 0.05)} ${X(0.3, 0.05)} ${X(0.25, 0.25)} Z`
      );
    }
    /** 流程图文档：底部波浪；`size` 为底褶高度占高度比例（draw.io 默认约 0.3）。 */
    case "document": {
      const raw = style?.get("size");
      let size = raw != null && raw !== "" ? Number(raw) : 0.3;
      if (!Number.isFinite(size)) size = 0.3;
      size = Math.max(0, Math.min(1, size));
      const dy = h * size;
      const fy = 1.4;
      return (
        `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - dy / 2}` +
        ` Q ${x + (w * 3) / 4} ${y + h - dy * fy} ${x + w / 2} ${y + h - dy / 2}` +
        ` Q ${x + w / 4} ${y + h - dy * (1 - fy)} ${x} ${y + h - dy / 2}` +
        ` L ${x} ${y + dy / 2} Z`
      );
    }
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}
