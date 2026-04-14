/**
 * 中间表示（IR）：与 draw.io 内部 mxGraphModel 解耦，便于分阶段扩展渲染。
 */

export type NodeShape =
  | "rect"
  | "ellipse"
  | "rhombus"
  | "hexagon"
  | "parallelogram"
  | "cylinder"
  | "triangle"
  | "trapezoid";

/** 可见图元（顶点）。 */
export interface DiagramNode {
  id: string;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  /** `mxGeometry` 的 `rotation`（度），绕框中心；0 表示不旋转。 */
  rotation: number;
  label: string;
  shape: NodeShape;
  /** 原始 style 键值（小写 key，便于扩展） */
  style: Map<string, string>;
}

/**
 * 边：折线顶点序列（页面绝对坐标，至少 2 点）。
 * 由 geometry 内 sourcePoint / points[] / targetPoint 或 source+target 解析得到。
 */
export interface DiagramEdge {
  id: string;
  parentId: string | null;
  points: { x: number; y: number }[];
  label: string;
  /** 边标签锚点（页面绝对坐标），来自 `mxPoint as="label"` 且 x 不在 [0,1]。 */
  labelPosition?: { x: number; y: number };
  /** `mxPoint as="label"` 且 x 在 [0,1]：沿最终渲染路径的弧长比例与法向偏移（像素）。 */
  edgeLabelPath?: { fraction: number; normalOffset: number };
  /** `relative=1` 且 geometry 带 x/y：相对路径几何中点的偏移。 */
  edgeLabelMidOffset?: { dx: number; dy: number };
  style: Map<string, string>;
  source?: string;
  target?: string;
}

export interface DiagramPage {
  id: string;
  name: string;
  pageWidth: number;
  pageHeight: number;
  /** 仅包含有几何的可见顶点（已过滤 root 占位 cell）。 */
  nodes: DiagramNode[];
  /** 可渲染的边（阶段 2+）。 */
  edges: DiagramEdge[];
}

export interface DiagramDoc {
  pages: DiagramPage[];
}
