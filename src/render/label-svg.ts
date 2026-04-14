import { EMPTY_MX_STYLE, svgFontAttrString } from "../text/mx-font.ts";
import { esc, textFillOpacityAttr } from "./svg-util.ts";

export interface LabelBlockOpts {
  /** 浅色描边，叠在折线等深色背景上时提高可读性 */
  contrastStroke?: boolean;
  /** 对应 draw.io `fontColor`，默认 `#000000` */
  fill?: string;
  /** 用于 `fontStyle` / `fontFamily` 等与 `mx-font` 一致 */
  style?: Map<string, string>;
  /** 与 `RenderOptions.defaultFontStack` 一致 */
  defaultFontStack?: string;
  /**
   * SVG `text-anchor`；默认 `middle`。
   * 与 **`contentWidth`** 一起使用时，`cx`/`cy` 仍为**块几何中心**，起笔 `x = cx ± contentWidth/2`。
   */
  textAnchor?: "start" | "middle" | "end";
  /** 与 `measureVertexLabelDisplayBlock().width` 一致，用于 `start`/`end` 时换算 `x` */
  contentWidth?: number;
}

/** 形状内居中标签：单行用 dominant-baseline；多行用绝对 y 的 tspan 垂直居中。 */
export function renderSvgLabelBlock(
  cx: number,
  cy: number,
  fs: number,
  label: string,
  opts?: LabelBlockOpts,
): string {
  const lines = label.split(/\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return "";

  const lh = fs * 1.2;
  const escLine = (s: string) => esc(s.trim());
  const fill = esc(opts?.fill ?? "#000000");
  const halo =
    opts?.contrastStroke === true
      ? ' paint-order="stroke fill" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round"'
      : "";
  const st = opts?.style ?? EMPTY_MX_STYLE;
  const fontAttrs = svgFontAttrString(st, esc, opts?.defaultFontStack);
  const fontFillOp = textFillOpacityAttr(st);

  const ta = opts?.textAnchor ?? "middle";
  const tw = opts?.contentWidth;
  let xRef = cx;
  if (typeof tw === "number" && tw > 0) {
    if (ta === "start") xRef = cx - tw / 2;
    else if (ta === "end") xRef = cx + tw / 2;
  }

  if (lines.length === 1) {
    return `<text x="${xRef}" y="${cy}" text-anchor="${ta}" dominant-baseline="middle" font-size="${fs}" ${fontAttrs} fill="${fill}"${fontFillOp}${halo}>${escLine(
      lines[0],
    )}</text>`;
  }

  const yFirst = cy - ((lines.length - 1) * lh) / 2;
  const tspans = lines
    .map((line, i) => `<tspan x="${xRef}" y="${yFirst + i * lh}">${escLine(line)}</tspan>`)
    .join("");
  return `<text text-anchor="${ta}" font-size="${fs}" ${fontAttrs} fill="${fill}"${fontFillOp}${halo}>${tspans}</text>`;
}
