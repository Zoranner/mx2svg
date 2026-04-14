import { XMLParser } from "fast-xml-parser";

/** 与 draw.io / mxGraphModel XML 结构匹配的解析器实例（全库共用）。 */
export const mxXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (tagName) => tagName === "mxCell" || tagName === "diagram",
  // 大型图里 `value` 含大量 HTML 实体（&lt; 等），默认 maxTotalExpansions=1000 易超限
  processEntities: { maxTotalExpansions: 500_000, maxEntityCount: 50_000 },
});
