import type { DiagramNode } from "../core/model.ts";
import { adjustCenterConnectorEndpoints } from "../edge/edge-endpoint-spacing.ts";

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
