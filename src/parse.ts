import { XMLParser } from "fast-xml-parser";
import { decompressDiagramInner } from "./decompress.ts";
import { adjustCenterConnectorEndpoints } from "./edge-endpoint-spacing.ts";
import type { DiagramDoc, DiagramEdge, DiagramNode, DiagramPage } from "./model.ts";
import { mxLabelToPlainText } from "./mx-label-plain.ts";
import { inferShape, parseMxStyle } from "./parse-style.ts";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (tagName) => tagName === "mxCell" || tagName === "diagram",
});

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function numAttr(obj: Record<string, unknown>, key: string, fallback: number): number {
  const raw = obj[`@_${key}`];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function strAttr(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[`@_${key}`];
  return v == null ? undefined : String(v);
}

function parseGeometry(
  geo: Record<string, unknown> | undefined,
): { x: number; y: number; width: number; height: number } | null {
  if (!geo || typeof geo !== "object") return null;
  const w = numAttr(geo, "width", NaN);
  const h = numAttr(geo, "height", NaN);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }
  return {
    x: numAttr(geo, "x", 0),
    y: numAttr(geo, "y", 0),
    width: w,
    height: h,
  };
}

function diagramCompressedOrRawText(diagramEl: Record<string, unknown>): string | null {
  const text = diagramEl["#text"];
  if (typeof text === "string" && text.trim()) {
    return decompressDiagramInner(text);
  }
  return null;
}

function parseMxPoint(obj: Record<string, unknown>): { x: number; y: number } | null {
  const x = numAttr(obj, "x", NaN);
  const y = numAttr(obj, "y", NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/** 从边的 mxGeometry 提取折线点（sourcePoint → Array points → targetPoint）。 */
function edgePointsFromGeometry(
  geo: Record<string, unknown> | undefined,
): { x: number; y: number }[] | null {
  if (!geo) return null;

  const allMxPoints = asArray<Record<string, unknown>>(
    geo.mxPoint as Record<string, unknown> | Record<string, unknown>[],
  );
  let source: { x: number; y: number } | undefined;
  let target: { x: number; y: number } | undefined;
  const loose: { x: number; y: number }[] = [];

  for (const o of allMxPoints) {
    const p = parseMxPoint(o);
    if (!p) continue;
    const as = strAttr(o, "as");
    if (as === "sourcePoint") source = p;
    else if (as === "targetPoint") target = p;
    else loose.push(p);
  }

  const arrayPoints: { x: number; y: number }[] = [];
  const arrRaw = geo.Array;
  if (arrRaw && typeof arrRaw === "object" && !Array.isArray(arrRaw)) {
    const inner = asArray<Record<string, unknown>>(
      (arrRaw as Record<string, unknown>).mxPoint as
        | Record<string, unknown>
        | Record<string, unknown>[],
    );
    for (const o of inner) {
      const p = parseMxPoint(o);
      if (p) arrayPoints.push(p);
    }
  }

  const parts: { x: number; y: number }[] = [];
  if (source) parts.push(source);
  parts.push(...arrayPoints);
  if (target) parts.push(target);

  if (parts.length >= 2) return parts;
  if (loose.length >= 2) return loose;
  if (source && target) return [source, target];
  return null;
}

function mxPointByAs(
  geo: Record<string, unknown> | undefined,
  targetAs: string,
): { x: number; y: number } | null {
  if (!geo) return null;
  const list = asArray<Record<string, unknown>>(
    geo.mxPoint as Record<string, unknown> | Record<string, unknown>[],
  );
  for (const o of list) {
    if (strAttr(o, "as") === targetAs) {
      return parseMxPoint(o);
    }
  }
  return null;
}

/** 边标签几何：比例/中点偏移在渲染阶段用最终路径（含跳线）计算。 */
function parseEdgeLabelFields(
  geo: Record<string, unknown> | undefined,
): Pick<DiagramEdge, "labelPosition" | "edgeLabelPath" | "edgeLabelMidOffset"> {
  const out: Pick<DiagramEdge, "labelPosition" | "edgeLabelPath" | "edgeLabelMidOffset"> = {};
  if (!geo) return out;

  const labelMx = mxPointByAs(geo, "label");
  if (labelMx && (labelMx.x !== 0 || labelMx.y !== 0)) {
    const { x: lx, y: ly } = labelMx;
    if (lx >= 0 && lx <= 1) {
      out.edgeLabelPath = { fraction: lx, normalOffset: ly };
    } else {
      out.labelPosition = { x: lx, y: ly };
    }
    return out;
  }

  if (strAttr(geo, "relative") === "1") {
    const ox = numAttr(geo, "x", 0);
    const oy = numAttr(geo, "y", 0);
    if (ox !== 0 || oy !== 0) {
      out.edgeLabelMidOffset = { dx: ox, dy: oy };
    }
  }

  return out;
}

function parseGraphModelObject(modelObj: Record<string, unknown>): {
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

    if (usedCenterFallback && pts.length === 2 && source && target) {
      const a = nodeById.get(source);
      const b = nodeById.get(target);
      const spacing = Number(style.get("spacing"));
      if (a && b && Number.isFinite(spacing) && spacing > 0) {
        const adj = adjustCenterConnectorEndpoints(pts[0], pts[1], a, b, spacing);
        if (adj) pts = adj;
      }
    }
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

function parseMxGraphModelFromDoc(modelObj: Record<string, unknown>): {
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

export function parseDrawioXml(xml: string): DiagramDoc {
  if (!xml.includes("<mxfile") && !xml.includes("<mxGraphModel")) {
    throw new Error("mx2svg: expected <mxfile> or <mxGraphModel> in input");
  }

  const root = xmlParser.parse(xml) as Record<string, unknown>;
  const mxfile = root.mxfile as Record<string, unknown> | undefined;
  if (!mxfile) {
    if (root.mxGraphModel) {
      const m = root.mxGraphModel as Record<string, unknown>;
      const { pageWidth, pageHeight, nodes, edges } = parseMxGraphModelFromDoc(m);
      return {
        pages: [
          {
            id: "default",
            name: "Page-1",
            pageWidth,
            pageHeight,
            nodes,
            edges,
          },
        ],
      };
    }
    throw new Error("mx2svg: missing <mxfile> root");
  }

  const diagrams = asArray<Record<string, unknown>>(
    mxfile.diagram as Record<string, unknown> | Record<string, unknown>[],
  );
  const pages: DiagramPage[] = [];

  for (const d of diagrams) {
    const id = strAttr(d, "id") ?? `page-${pages.length}`;
    const name = strAttr(d, "name") ?? "Page-1";

    let modelObj: Record<string, unknown> | null = null;

    if (d.mxGraphModel && typeof d.mxGraphModel === "object") {
      modelObj = d.mxGraphModel as Record<string, unknown>;
    } else {
      const innerXml = diagramCompressedOrRawText(d);
      if (innerXml) {
        const inner = xmlParser.parse(innerXml) as Record<string, unknown>;
        modelObj = (inner.mxGraphModel as Record<string, unknown>) ?? null;
      }
    }

    if (!modelObj) continue;

    const { pageWidth, pageHeight, nodes, edges } = parseMxGraphModelFromDoc(modelObj);
    pages.push({ id, name, pageWidth, pageHeight, nodes, edges });
  }

  if (pages.length === 0) {
    throw new Error("mx2svg: no parsable diagram pages");
  }

  return { pages };
}
