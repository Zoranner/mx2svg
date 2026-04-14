import type { DiagramEdge } from "../core/model.ts";
import {
  polylinePointAtLengthFraction,
  polylinePointWithPerpendicularOffset,
} from "../edge/polyline.ts";

/** draw.io `labelPadding`：沿路径法向偏移（像素），与 `polylinePointWithPerpendicularOffset` 正方向一致。 */
export function edgeLabelPaddingPx(style: Map<string, string>): number {
  const raw = style.get("labelpadding");
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function edgeLabelAnchor(
  e: DiagramEdge,
  metrics: { x: number; y: number }[],
): { x: number; y: number } {
  if (metrics.length < 2) {
    return metrics[0] ?? { x: 0, y: 0 };
  }
  const pad = edgeLabelPaddingPx(e.style);

  if (e.edgeLabelPath) {
    let pt = polylinePointWithPerpendicularOffset(
      metrics,
      e.edgeLabelPath.fraction,
      e.edgeLabelPath.normalOffset + pad,
    );
    if (e.edgeLabelMidOffset) {
      pt = {
        x: pt.x + e.edgeLabelMidOffset.dx,
        y: pt.y + e.edgeLabelMidOffset.dy,
      };
    }
    return pt;
  }
  if (e.edgeLabelMidOffset) {
    const base =
      pad === 0
        ? polylinePointAtLengthFraction(metrics, 0.5)
        : polylinePointWithPerpendicularOffset(metrics, 0.5, pad);
    return { x: base.x + e.edgeLabelMidOffset.dx, y: base.y + e.edgeLabelMidOffset.dy };
  }
  if (e.labelPosition) {
    return e.labelPosition;
  }
  if (pad === 0) {
    return polylinePointAtLengthFraction(metrics, 0.5);
  }
  return polylinePointWithPerpendicularOffset(metrics, 0.5, pad);
}
