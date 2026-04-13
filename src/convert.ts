import { parseDrawioXml } from "./parse.ts";
import { renderToSvg, type RenderOptions } from "./render.ts";

export type ConvertOptions = RenderOptions;

/**
 * draw.io / diagrams.net XML → SVG 字符串。
 * 当前阶段：仅渲染带 mxGeometry 的顶点（矩形/椭圆）与纯文本标签；边、泳道、表格等后续迭代。
 */
export function convert(drawioXml: string, options: ConvertOptions = {}): string {
  const doc = parseDrawioXml(drawioXml);
  return renderToSvg(doc, options);
}
