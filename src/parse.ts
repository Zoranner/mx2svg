import { XMLParser } from "fast-xml-parser";
import { decompressDiagramInner } from "./decompress.ts";
import { inferShape, parseMxStyle } from "./parse-style.ts";
import type { DiagramDoc, DiagramNode, DiagramPage } from "./model.ts";

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

function parseGraphModelObject(modelObj: Record<string, unknown>): DiagramPage["nodes"] {
  const root = modelObj.root as Record<string, unknown> | undefined;
  if (!root) return [];

  const cells = asArray<Record<string, unknown>>(root.mxCell as Record<string, unknown> | Record<string, unknown>[]);
  const nodes: DiagramNode[] = [];

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

    nodes.push({
      id,
      parentId: parent,
      x: g.x,
      y: g.y,
      width: g.width,
      height: g.height,
      label: decodeMxValue(value),
      shape: inferShape(style),
      style,
    });
  }

  return nodes;
}

/** HTML 实体与常见转义（标签在标签外 value 中较少，先保守处理）。 */
function decodeMxValue(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#xa;/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
}

function parseMxGraphModelFromDoc(modelObj: Record<string, unknown>): {
  pageWidth: number;
  pageHeight: number;
  nodes: DiagramNode[];
} {
  const pageWidth = numAttr(modelObj, "pageWidth", 850);
  const pageHeight = numAttr(modelObj, "pageHeight", 1100);
  const nodes = parseGraphModelObject(modelObj);
  return { pageWidth, pageHeight, nodes };
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
      const { pageWidth, pageHeight, nodes } = parseMxGraphModelFromDoc(m);
      return {
        pages: [
          {
            id: "default",
            name: "Page-1",
            pageWidth,
            pageHeight,
            nodes,
          },
        ],
      };
    }
    throw new Error("mx2svg: missing <mxfile> root");
  }

  const diagrams = asArray<Record<string, unknown>>(mxfile.diagram as Record<string, unknown> | Record<string, unknown>[]);
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

    const { pageWidth, pageHeight, nodes } = parseMxGraphModelFromDoc(modelObj);
    pages.push({ id, name, pageWidth, pageHeight, nodes });
  }

  if (pages.length === 0) {
    throw new Error("mx2svg: no parsable diagram pages");
  }

  return { pages };
}
