import type { DiagramNode } from "../core/model.ts";

/** draw.io 边样式 `exitX`/`exitY`/`entryX`/`entryY`（相对单元 0～1，左上为原点）。 */
export function parseEdgeConnectionHints(style: Map<string, string>): {
  exitX?: number;
  exitY?: number;
  entryX?: number;
  entryY?: number;
} {
  const out: {
    exitX?: number;
    exitY?: number;
    entryX?: number;
    entryY?: number;
  } = {};
  const parse = (key: string): number | undefined => {
    const raw = style.get(key);
    if (raw == null || raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const ex = parse("exitx");
  const ey = parse("exity");
  const ix = parse("entryx");
  const iy = parse("entryy");
  if (ex !== undefined) out.exitX = ex;
  if (ey !== undefined) out.exitY = ey;
  if (ix !== undefined) out.entryX = ix;
  if (iy !== undefined) out.entryY = iy;
  return out;
}

/** 轴对齐包围盒上的连接点（与 draw.io 默认矩形端点一致；复杂形状暂用 bbox）。 */
export function rectConnectionPointFromRatios(
  n: DiagramNode,
  relX: number,
  relY: number,
): { x: number; y: number } {
  return {
    x: n.x + relX * n.width,
    y: n.y + relY * n.height,
  };
}

/**
 * 无 exit/entry 时：按两形状中心相对位置选择「对边」端点，使正交边呈竖-横-竖 或 横-竖-横（与常见 draw.io 路由一致）。
 */
export function inferOrthogonalTerminals(
  a: DiagramNode,
  b: DiagramNode,
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const sc = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const tc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    return {
      start: rectConnectionPointFromRatios(a, 0.5, 0.5),
      end: rectConnectionPointFromRatios(b, 0.5, 0.5),
    };
  }
  if (Math.abs(dy) >= Math.abs(dx)) {
    if (dy <= 0) {
      return {
        start: rectConnectionPointFromRatios(a, 0.5, 0),
        end: rectConnectionPointFromRatios(b, 0.5, 1),
      };
    }
    return {
      start: rectConnectionPointFromRatios(a, 0.5, 1),
      end: rectConnectionPointFromRatios(b, 0.5, 0),
    };
  }
  if (dx > 0) {
    return {
      start: rectConnectionPointFromRatios(a, 1, 0.5),
      end: rectConnectionPointFromRatios(b, 0, 0.5),
    };
  }
  return {
    start: rectConnectionPointFromRatios(a, 0, 0.5),
    end: rectConnectionPointFromRatios(b, 1, 0.5),
  };
}

export function orthogonalEndpointsFromStyleOrInfer(
  style: Map<string, string>,
  source: DiagramNode,
  target: DiagramNode,
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const h = parseEdgeConnectionHints(style);
  const inferred = inferOrthogonalTerminals(source, target);
  const start =
    h.exitX != null && h.exitY != null
      ? rectConnectionPointFromRatios(source, h.exitX, h.exitY)
      : inferred.start;
  const end =
    h.entryX != null && h.entryY != null
      ? rectConnectionPointFromRatios(target, h.entryX, h.entryY)
      : inferred.end;
  return { start, end };
}
