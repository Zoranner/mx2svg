import { parseDrawioXml } from "./parse.ts";
import { type RenderOptions, renderToSvg } from "./render.ts";

export type ConvertOptions = RenderOptions;

/**
 * draw.io / diagrams.net XML → SVG 字符串。
 * 顶点：矩形/椭圆与单行文本标签。
 * 边：折线（geometry 内 mxPoint / 或 source+target 连中心）、描边、虚线、简单箭头。
 */
export function convert(drawioXml: string, options: ConvertOptions = {}): string {
  const doc = parseDrawioXml(drawioXml);
  return renderToSvg(doc, options);
}
