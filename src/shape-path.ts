import type { NodeShape } from "./model.ts";

/** 与 bbox 对齐的简单 path（绝对坐标），供 `shape=*` 顶点填充与描边。 */
export function shapePathD(shape: NodeShape, x: number, y: number, w: number, h: number): string | null {
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
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}
