import type { DiagramEdge, DiagramNode, DiagramRenderItem } from "../core/model.ts";
import { perimeterPointFromCenterToward } from "../edge/edge-endpoint-spacing.ts";
import {
  orthogonalizeTwoPointPolyline,
  styleIsOrthogonalEdge,
} from "../edge/edge-orthogonal-fallback.ts";
import { mxLabelHtmlFontSizePx, mxLabelToPlainText } from "../text/mx-label-plain.ts";
import { applyEdgePointDirectionFromTerminals } from "./edge-direction.ts";
import { maybeAdjustCenterConnectorPoints } from "./edge-endpoints.ts";
import {
  edgeArrayWaypointCount,
  edgeGeometryHasExplicitTerminals,
  edgePointsFromGeometry,
  parseEdgeLabelChildGeometry,
  parseEdgeLabelFields,
  parseGeometry,
} from "./mx-geometry.ts";
import { inferShape, parseMxStyle } from "./style.ts";
import { asArray, numAttr, strAttr } from "./xml-helpers.ts";

const EDGE_LABEL_STYLE_KEYS = [
  "fontsize",
  "fontcolor",
  "fontstyle",
  "align",
  "verticalalign",
  "labelbackgroundcolor",
  "labelbordercolor",
  "labelborderwidth",
  "whitespace",
  "fontfamily",
  "letterspacing",
  "lineheight",
  "labelpadding",
] as const;

function styleHasEdgeLabel(style: Map<string, string>): boolean {
  return style.has("edgelabel");
}

function pointsNearlyEqual(
  a: { x: number; y: number },
  b: { x: number; y: number },
  eps = 1,
): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= eps;
}

export function parseGraphModelObject(modelObj: Record<string, unknown>): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  renderOrder: DiagramRenderItem[];
} {
  const root = modelObj.root as Record<string, unknown> | undefined;
  if (!root) return { nodes: [], edges: [], renderOrder: [] };

  const cells = asArray<Record<string, unknown>>(
    root.mxCell as Record<string, unknown> | Record<string, unknown>[],
  );

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  for (const cell of cells) {
    const id = strAttr(cell, "id");
    if (!id || id === "0" || id === "1") continue;

    const edge = strAttr(cell, "edge");
    if (edge === "1") continue;

    const vertex = strAttr(cell, "vertex");
    if (vertex !== "1") continue;

    const geoRaw = cell.mxGeometry;
    const geoObj = Array.isArray(geoRaw) ? geoRaw[0] : geoRaw;
    const g = parseGeometry(geoObj as Record<string, unknown> | undefined);
    if (!g) continue;

    const styleStr = strAttr(cell, "style");
    const style = parseMxStyle(styleStr);
    if (styleHasEdgeLabel(style)) continue;

    const value = strAttr(cell, "value") ?? "";
    const parent = strAttr(cell, "parent") ?? null;
    const rotation = numAttr(geoObj as Record<string, unknown>, "rotation", 0);
    const tooltip = strAttr(cell, "tooltip");

    nodes.push({
      id,
      parentId: parent,
      x: g.x,
      y: g.y,
      width: g.width,
      height: g.height,
      rotation,
      label: mxLabelToPlainText(value),
      shape: inferShape(style),
      style,
      ...(tooltip != null && tooltip !== "" ? { tooltip } : {}),
    });
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));

  for (const cell of cells) {
    const id = strAttr(cell, "id");
    if (!id || id === "0" || id === "1") continue;
    if (strAttr(cell, "edge") !== "1") continue;

    const geoRaw = cell.mxGeometry;
    const geoObj = (Array.isArray(geoRaw) ? geoRaw[0] : geoRaw) as
      | Record<string, unknown>
      | undefined;
    let pts = edgePointsFromGeometry(geoObj);
    let usedCenterFallback = false;

    const source = strAttr(cell, "source");
    const target = strAttr(cell, "target");
    const explicitTerminals = edgeGeometryHasExplicitTerminals(geoObj);
    const arrayWpCount = edgeArrayWaypointCount(geoObj);

    if (pts && pts.length >= 1 && source && target && !explicitTerminals && arrayWpCount > 0) {
      const a = nodeById.get(source);
      const b = nodeById.get(target);
      if (a && b) {
        const first = pts[0]!;
        const last = pts[pts.length - 1]!;
        const start = perimeterPointFromCenterToward(a, first);
        const end = perimeterPointFromCenterToward(b, last);
        const merged: { x: number; y: number }[] = [];
        if (!pointsNearlyEqual(start, first)) merged.push(start);
        merged.push(...pts);
        if (!pointsNearlyEqual(end, last)) merged.push(end);
        pts = merged;
      }
    } else if ((!pts || pts.length < 2) && source && target) {
      const a = nodeById.get(source);
      const b = nodeById.get(target);
      if (a && b) {
        pts = [
          { x: a.x + a.width / 2, y: a.y + a.height / 2 },
          { x: b.x + b.width / 2, y: b.y + b.height / 2 },
        ];
        usedCenterFallback = true;
      }
    }

    if (!pts || pts.length < 2) continue;

    const styleStr = strAttr(cell, "style");
    const style = parseMxStyle(styleStr);

    const { pts: ptsAfterSpacing, didSpacing } = maybeAdjustCenterConnectorPoints(pts, {
      usedCenterFallback,
      source,
      target,
      style,
      nodeById,
    });
    pts = ptsAfterSpacing;

    /** 仅正交边在「中心回退」时用形状周界端点再折线；默认直线边仍用中心连线（与 draw.io 常见导出一致）。 */
    if (
      usedCenterFallback &&
      pts.length === 2 &&
      source &&
      target &&
      !didSpacing &&
      styleIsOrthogonalEdge(style)
    ) {
      const a = nodeById.get(source);
      const b = nodeById.get(target);
      if (a && b) {
        const cA = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
        const cB = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        pts = [perimeterPointFromCenterToward(a, cB), perimeterPointFromCenterToward(b, cA)];
      }
    }

    if (usedCenterFallback && pts.length === 2 && styleIsOrthogonalEdge(style)) {
      pts = orthogonalizeTwoPointPolyline(pts);
    }
    const value = strAttr(cell, "value") ?? "";
    const parent = strAttr(cell, "parent") ?? null;
    const tooltip = strAttr(cell, "tooltip");
    const labelFields = parseEdgeLabelFields(geoObj);
    const geoW = geoObj ? numAttr(geoObj, "width", NaN) : NaN;
    const labelWrapWidth = Number.isFinite(geoW) && geoW > 0 ? geoW : undefined;

    edges.push({
      id,
      parentId: parent,
      points: pts,
      label: mxLabelToPlainText(value),
      ...labelFields,
      ...(labelWrapWidth !== undefined ? { labelWrapWidth } : {}),
      style,
      ...(source ? { source } : {}),
      ...(target ? { target } : {}),
      ...(tooltip != null && tooltip !== "" ? { tooltip } : {}),
    });
  }

  const edgeById = new Map(edges.map((e) => [e.id, e] as const));

  for (const cell of cells) {
    const id = strAttr(cell, "id");
    if (!id || id === "0" || id === "1") continue;
    if (strAttr(cell, "edge") === "1") continue;
    if (strAttr(cell, "vertex") !== "1") continue;

    const styleStr = strAttr(cell, "style");
    const vStyle = parseMxStyle(styleStr);
    if (!styleHasEdgeLabel(vStyle)) continue;

    const parent = strAttr(cell, "parent");
    if (!parent) continue;
    const edge = edgeById.get(parent);
    if (!edge) continue;

    const rawVal = strAttr(cell, "value") ?? "";
    const text = mxLabelToPlainText(rawVal);
    if (text.trim()) {
      edge.label = edge.label.trim() ? `${edge.label}\n${text}` : text;
    }

    for (const k of EDGE_LABEL_STYLE_KEYS) {
      const v = vStyle.get(k);
      if (v !== undefined && v !== "") edge.style.set(k, v);
    }

    const fsFromHtml = mxLabelHtmlFontSizePx(rawVal);
    if (
      fsFromHtml != null &&
      (vStyle.get("fontsize") === undefined || vStyle.get("fontsize") === "")
    ) {
      edge.style.set("fontsize", String(fsFromHtml));
    }

    const geoRaw = cell.mxGeometry;
    const geoObj = (Array.isArray(geoRaw) ? geoRaw[0] : geoRaw) as
      | Record<string, unknown>
      | undefined;
    const childLabelGeo = parseEdgeLabelChildGeometry(geoObj);
    if (childLabelGeo.edgeLabelPath != null) edge.edgeLabelPath = childLabelGeo.edgeLabelPath;
    if (childLabelGeo.edgeLabelMidOffset != null)
      edge.edgeLabelMidOffset = childLabelGeo.edgeLabelMidOffset;
    if (childLabelGeo.labelPosition != null) edge.labelPosition = childLabelGeo.labelPosition;

    const geoW = geoObj ? numAttr(geoObj, "width", NaN) : NaN;
    if (Number.isFinite(geoW) && geoW > 0) edge.labelWrapWidth = geoW;
  }

  for (const e of edges) {
    applyEdgePointDirectionFromTerminals(e, nodeById);
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeIds = new Set(edges.map((e) => e.id));
  const renderOrder: DiagramRenderItem[] = [];
  for (const cell of cells) {
    const rid = strAttr(cell, "id");
    if (!rid || rid === "0" || rid === "1") continue;
    if (strAttr(cell, "edge") === "1") {
      if (edgeIds.has(rid)) renderOrder.push({ kind: "edge", id: rid });
    } else if (strAttr(cell, "vertex") === "1") {
      const st = parseMxStyle(strAttr(cell, "style"));
      if (!styleHasEdgeLabel(st) && nodeIds.has(rid)) {
        renderOrder.push({ kind: "node", id: rid });
      }
    }
  }

  return { nodes, edges, renderOrder };
}

export function parseMxGraphModelFromDoc(modelObj: Record<string, unknown>): {
  pageWidth: number;
  pageHeight: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  renderOrder: DiagramRenderItem[];
} {
  const pageWidth = numAttr(modelObj, "pageWidth", 850);
  const pageHeight = numAttr(modelObj, "pageHeight", 1100);
  const { nodes, edges, renderOrder } = parseGraphModelObject(modelObj);
  return { pageWidth, pageHeight, nodes, edges, renderOrder };
}
