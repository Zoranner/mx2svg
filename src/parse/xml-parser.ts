import { XMLParser } from "fast-xml-parser";

/** 与 draw.io / mxGraphModel XML 结构匹配的解析器实例（全库共用）。 */
export const mxXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (tagName) => tagName === "mxCell" || tagName === "diagram",
});
