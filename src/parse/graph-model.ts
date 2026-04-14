import type { DiagramEdge, DiagramNode } from "../core/model.ts";
import { mxLabelToPlainText } from "../text/mx-label-plain.ts";
import { maybeAdjustCenterConnectorPoints } from "./edge-endpoints.ts";
import { edgePointsFromGeometry, parseEdgeLabelFields, parseGeometry } from "./mx-geometry.ts";
import { inferShape, parseMxStyle } from "./style.ts";
import { asArray, numAttr, strAttr } from "./xml-helpers.ts";

export function parseGraphModelObject(modelObj: Record<string, unknown>): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  const root = modelObj.root as Record<string, unknown> | undefined;
  if (!root) return { nodes: [], edges: [] };

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
    const value = strAttr(cell, "value") ?? "";
    const parent = strAttr(cell, "parent") ?? null;
    const rotation = numAttr(geoObj as Record<string, unknown>, "rotation", 0);

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
    if ((!pts || pts.length < 2) && source && target) {
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

    pts = maybeAdjustCenterConnectorPoints(pts, {
      usedCenterFallback,
      source,
      target,
      style,
      nodeById,
    });
    const value = strAttr(cell, "value") ?? "";
    const parent = strAttr(cell, "parent") ?? null;
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
    });
  }

  return { nodes, edges };
}

export function parseMxGraphModelFromDoc(modelObj: Record<string, unknown>): {
  pageWidth: number;
  pageHeight: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  const pageWidth = numAttr(modelObj, "pageWidth", 850);
  const pageHeight = numAttr(modelObj, "pageHeight", 1100);
  const { nodes, edges } = parseGraphModelObject(modelObj);
  return { pageWidth, pageHeight, nodes, edges };
}
