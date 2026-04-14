import type { DiagramNode } from "../core/model.ts";
import {
  adjustCenterConnectorEndpoints,
  perimeterPointFromCenterToward,
  perimeterRayDistance,
  shapeAnchorFromRatios,
} from "../edge/edge-endpoint-spacing.ts";
import { styleIsOrthogonalEdge } from "../edge/edge-orthogonal-fallback.ts";
import { parseEdgeConnectionHints } from "../edge/edge-orthogonal-terminals.ts";

function unitVec(dx: number, dy: number): { x: number; y: number } | null {
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  return { x: dx / len, y: dy / len };
}

/**
 * 仅 `target`、且已有显式 mxPoint 时：导出里的 `targetPoint` 常落在其它图形上（如标题框），
 * 但 `target` 指向云等。保留原弦长上限，方向改为指向目标形状的 entry/中心，且不穿入周界（留 `gapPx`）。
 */
function adjustTargetOnlyFloatingEnd(
  p0: { x: number; y: number },
  pL: { x: number; y: number },
  targetCell: DiagramNode,
  h: ReturnType<typeof parseEdgeConnectionHints>,
  gapPx: number,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  const chord = Math.hypot(pL.x - p0.x, pL.y - p0.y);
  if (chord < 1e-6) return null;
  const aim =
    h.entryX != null && h.entryY != null
      ? shapeAnchorFromRatios(targetCell, h.entryX, h.entryY)
      : { x: targetCell.x + targetCell.width / 2, y: targetCell.y + targetCell.height / 2 };
  const u = unitVec(aim.x - p0.x, aim.y - p0.y);
  if (!u) return null;
  const tHit = perimeterRayDistance(p0, u, targetCell);
  const maxLen = tHit != null ? Math.max(0, tHit - gapPx) : chord;
  const eff = Math.min(chord, maxLen);
  return [p0, { x: p0.x + eff * u.x, y: p0.y + eff * u.y }];
}

/**
 * 直连边（非 orthogonalEdgeStyle）：
 * - **双端** source+target 且含 exit/entry：用形状周界锚点覆盖 geometry 中可能过期的端点。
 * - **单端** +显式 mxPoint：**仅 target** 时重算终点方向（指向 target 语义），保留弦长且不接到周界；
 *   **仅 source** 时仍保留文件坐标（少见，避免误伤）。
 */
export function snapEdgePointsToConnectionHints(
  pts: { x: number; y: number }[],
  opts: {
    source?: string;
    target?: string;
    style: Map<string, string>;
    nodeById: Map<string, DiagramNode>;
    /** mxGeometry 含 `as="sourcePoint"` / `targetPoint` 时为 true */
    geometryExplicitTerminals?: boolean;
  },
): { x: number; y: number }[] {
  const { source, target, style, nodeById, geometryExplicitTerminals = false } = opts;
  if (pts.length < 2) return pts;
  if (styleIsOrthogonalEdge(style)) return pts;

  const h = parseEdgeConnectionHints(style);
  const out = [...pts];

  if (source && target) {
    const a = nodeById.get(source);
    const b = nodeById.get(target);
    if (!a || !b) return pts;
    if (h.exitX != null && h.exitY != null) {
      out[0] = shapeAnchorFromRatios(a, h.exitX, h.exitY);
    }
    if (h.entryX != null && h.entryY != null) {
      out[out.length - 1] = shapeAnchorFromRatios(b, h.entryX, h.entryY);
    }
    return out;
  }

  const onlySource = Boolean(source) && !target;
  const onlyTarget = Boolean(target) && !source;
  if (onlyTarget && geometryExplicitTerminals && pts.length === 2) {
    const b = nodeById.get(target);
    if (b) {
      const p0 = pts[0]!;
      const pL = pts[1]!;
      const adj = adjustTargetOnlyFloatingEnd(p0, pL, b, h, 1);
      if (adj) return adj;
    }
    return pts;
  }
  if (onlySource && geometryExplicitTerminals) {
    return pts;
  }

  if (source && !target) {
    const a = nodeById.get(source);
    if (!a) return pts;
    if (h.exitX != null && h.exitY != null) {
      out[0] = shapeAnchorFromRatios(a, h.exitX, h.exitY);
    } else {
      const toward = pts[pts.length - 1]!;
      out[0] = perimeterPointFromCenterToward(a, toward);
    }
    return out;
  }

  if (!source && target) {
    const b = nodeById.get(target);
    if (!b) return pts;
    if (h.entryX != null && h.entryY != null) {
      out[out.length - 1] = shapeAnchorFromRatios(b, h.entryX, h.entryY);
    } else {
      const fromFree = pts[0]!;
      out[out.length - 1] = perimeterPointFromCenterToward(b, fromFree);
    }
    return out;
  }

  return pts;
}

/**
 * 解析阶段：若边因缺少 geometry 点而回退为「源/目标中心」连线，且 style 含正数 `spacing`，
 * 则把两端点沿周界与间距收紧（与 draw.io 一致）。
 */
export function maybeAdjustCenterConnectorPoints(
  pts: { x: number; y: number }[],
  opts: {
    usedCenterFallback: boolean;
    source?: string;
    target?: string;
    style: Map<string, string>;
    nodeById: Map<string, DiagramNode>;
  },
): { pts: { x: number; y: number }[]; didSpacing: boolean } {
  const { usedCenterFallback, source, target, style, nodeById } = opts;
  if (!usedCenterFallback || pts.length !== 2 || !source || !target) {
    return { pts, didSpacing: false };
  }
  const a = nodeById.get(source);
  const b = nodeById.get(target);
  if (!a || !b) return { pts, didSpacing: false };
  const spacing = Number(style.get("spacing"));
  if (!Number.isFinite(spacing) || spacing <= 0) return { pts, didSpacing: false };
  const adj = adjustCenterConnectorEndpoints(pts[0]!, pts[1]!, a, b, spacing);
  if (!adj) return { pts, didSpacing: false };
  return { pts: adj, didSpacing: true };
}
