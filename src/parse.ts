import type { DiagramDoc, DiagramPage } from "./core/model.ts";
import { diagramCompressedOrRawText } from "./parse/diagram-payload.ts";
import { parseMxGraphModelFromDoc } from "./parse/graph-model.ts";
import { asArray, strAttr } from "./parse/xml-helpers.ts";
import { mxXmlParser } from "./parse/xml-parser.ts";

export function parseDrawioXml(xml: string): DiagramDoc {
  if (!xml.includes("<mxfile") && !xml.includes("<mxGraphModel")) {
    throw new Error("mx2svg: expected <mxfile> or <mxGraphModel> in input");
  }

  const root = mxXmlParser.parse(xml) as Record<string, unknown>;
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
        const inner = mxXmlParser.parse(innerXml) as Record<string, unknown>;
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
