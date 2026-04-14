import {
  buildCurvedEdgePathD,
  curvedEdgeToPolylineApprox,
  isCurvedEdgeStyle,
} from "../edge-curve.ts";
import { buildJumpPathDAndPolyline, collectJumpMap, type EdgeWaypointRef } from "../edge-jump.ts";
import {
  buildRoundedOrthogonalPathD,
  edgePolylineForLengthAndBounds,
  edgeRoundedArcSizeFromStyle,
  roundedOrthogonalToPolylineApprox,
  useRoundedOrthogonalPath,
} from "../edge-rounded.ts";
import type { DiagramEdge } from "../model.ts";

export interface EdgeLineMetrics {
  metricsPolyline: { x: number; y: number }[];
  pathD: string | null;
  polylinePoints: { x: number; y: number }[] | null;
}

export function computeEdgeLineMetrics(edges: DiagramEdge[]): Map<string, EdgeLineMetrics> {
  const waypoints: EdgeWaypointRef[] = edges.map((e) => ({
    id: e.id,
    points: e.points,
    style: e.style,
  }));
  const out = new Map<string, EdgeLineMetrics>();

  for (const e of edges) {
    const sw = Number(e.style.get("strokewidth") ?? "1") || 1;
    const ref: EdgeWaypointRef = { id: e.id, points: e.points, style: e.style };
    const jumpMap = collectJumpMap(e.points, ref, waypoints);
    const jump = buildJumpPathDAndPolyline(e.points, jumpMap, e.style, sw);

    if (jump) {
      out.set(e.id, {
        metricsPolyline: jump.polyline,
        pathD: jump.d,
        polylinePoints: null,
      });
      continue;
    }

    if (isCurvedEdgeStyle(e.style)) {
      out.set(e.id, {
        metricsPolyline: curvedEdgeToPolylineApprox(e.points),
        pathD: buildCurvedEdgePathD(e.points),
        polylinePoints: null,
      });
      continue;
    }

    if (useRoundedOrthogonalPath(e.style, e.points.length)) {
      const arc = edgeRoundedArcSizeFromStyle(e.style);
      out.set(e.id, {
        metricsPolyline: roundedOrthogonalToPolylineApprox(e.points, arc),
        pathD: buildRoundedOrthogonalPathD(e.points, arc),
        polylinePoints: null,
      });
      continue;
    }

    const metricsPolyline = edgePolylineForLengthAndBounds(e.points, e.style);
    out.set(e.id, {
      metricsPolyline,
      pathD: null,
      polylinePoints: e.points,
    });
  }

  return out;
}
