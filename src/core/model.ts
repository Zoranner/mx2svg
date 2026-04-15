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
  | "trapezoid"
  | "cloud"
  | "document"
  | "pentagon"
  | "dataStorage"
  | "internalStorage"
  /** 流程图「过程」：矩形左侧竖条（draw.io `shape=process`）。 */
  | "process"
  /** 流程图「延迟」：左直边 + 右半圆（draw.io `shape=delay`）。 */
  | "delay";

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
  /** `mxCell` 的 **`tooltip`** 属性 → SVG **`<title>`**（原生悬停提示）。 */
  tooltip?: string;
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
  /** 边标签锚点（页面绝对坐标），来自 `mxPoint as="label"` 且 x 超出 mxGraph 边标签相对范围 [-1,1]。 */
  labelPosition?: { x: number; y: number };
  /** 沿最终渲染路径从源到目标的弧长比例 [0,1]与法向偏移（像素）；由 mxGraph `relative=1` 的 x（[-1,1]）映射为 `fraction=(x+1)/2`。 */
  edgeLabelPath?: { fraction: number; normalOffset: number };
  /** `relative=1` 且 geometry 带 x/y：相对路径几何中点的偏移。 */
  edgeLabelMidOffset?: { dx: number; dy: number };
  /** 边 `mxGeometry` 的 `width`（>0）：`whiteSpace=wrap` 时作为标签最大行宽（像素）。 */
  labelWrapWidth?: number;
  style: Map<string, string>;
  source?: string;
  target?: string;
  /** `mxCell` 的 **`tooltip`** 属性 → SVG **`<title>`**。 */
  tooltip?: string;
}

/** 与 mxGraphModel 中 mxCell 文档顺序一致，用于 SVG 叠放顺序（后绘在上层）。 */
export type DiagramRenderItem = { kind: "node"; id: string } | { kind: "edge"; id: string };

export interface DiagramPage {
  id: string;
  name: string;
  pageWidth: number;
  pageHeight: number;
  /** 仅包含有几何的可见顶点（已过滤 root 占位 cell）。 */
  nodes: DiagramNode[];
  /** 可渲染的边（阶段 2+）。 */
  edges: DiagramEdge[];
  /** 缺省时渲染器按「全部顶点再全部边」处理。 */
  renderOrder?: DiagramRenderItem[];
}

export interface DiagramDoc {
  pages: DiagramPage[];
}
