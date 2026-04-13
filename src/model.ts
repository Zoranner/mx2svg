/**
 * 中间表示（IR）：与 draw.io 内部 mxGraphModel 解耦，便于分阶段扩展渲染。
 */

export type NodeShape = "rect" | "ellipse";

/** 可见图元（顶点）；边在后续阶段加入。 */
export interface DiagramNode {
  id: string;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  shape: NodeShape;
  /** 原始 style 键值（小写 key，便于扩展） */
  style: Map<string, string>;
}

export interface DiagramPage {
  id: string;
  name: string;
  pageWidth: number;
  pageHeight: number;
  /** 仅包含有几何的可见顶点（已过滤 root 占位 cell）。 */
  nodes: DiagramNode[];
}

export interface DiagramDoc {
  pages: DiagramPage[];
}
