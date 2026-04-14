import { createCanvas } from "@napi-rs/canvas";

/**
 * draw.io / mxGraph 样式中的字体：与 mxConstants 一致。
 * - FONT_BOLD = 1
 * - FONT_ITALIC = 2
 * - FONT_UNDERLINE = 4
 */
export const MX_FONT_BOLD = 1;
export const MX_FONT_ITALIC = 2;
export const MX_FONT_UNDERLINE = 4;

/** 与历史渲染一致的无衬线回退栈（`fontFamily` 未设或占位时）。 */
export const DEFAULT_FONT_STACK = "Arial, Helvetica, sans-serif";

/** 共享空样式（勿 mutate），用于默认参数。 */
export const EMPTY_MX_STYLE = new Map<string, string>();

export function mxFontStyleBits(style: Map<string, string>): number {
  const raw = style.get("fontstyle");
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n | 0;
}

/**
 * `fontFamily=...`：前置用户字体，再接默认栈尾部。
 * `defaultTailStack`：单元格未指定 `fontFamily` 时整段使用的栈（覆盖库内 `DEFAULT_FONT_STACK`）。
 */
export function svgFontStack(style: Map<string, string>, defaultTailStack?: string): string {
  const fam = style.get("fontfamily")?.trim();
  const tail = defaultTailStack?.trim() || DEFAULT_FONT_STACK;
  if (!fam || fam.toLowerCase() === "default") {
    return tail;
  }
  return `${fam}, ${tail}`;
}

/**
 * Canvas `font` 串，供 Pretext 测量（顺序：font-style font-weight size family）。
 */
export function canvasFontString(
  fontSizePx: number,
  style: Map<string, string>,
  defaultTailStack?: string,
): string {
  const bits = mxFontStyleBits(style);
  const weight = (bits & MX_FONT_BOLD) !== 0 ? "bold" : "normal";
  const slant = (bits & MX_FONT_ITALIC) !== 0 ? "italic" : "normal";
  const family = svgFontStack(style, defaultTailStack);
  const parts: string[] = [];
  if (slant !== "normal") parts.push(slant);
  if (weight !== "normal") parts.push(weight);
  parts.push(`${fontSizePx}px`);
  parts.push(family);
  return parts.join(" ");
}

/**
 * 标签行高（像素）：**`lineHeight`** 样式。
 * - **`≤4`**：相对字号的**倍数**（如 **`1.2`**）；
 * - **`5～500`**：**百分比**（如 **`120`** = **120%**）；
 * - 缺省 **1.2×** 字号。
 */
export function mxStyleLabelLineHeightPx(fontSizePx: number, style: Map<string, string>): number {
  const raw = style.get("lineheight")?.trim();
  if (!raw) return fontSizePx * 1.2;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fontSizePx * 1.2;
  if (n <= 4) return fontSizePx * n;
  if (n <= 500) return (fontSizePx * n) / 100;
  return fontSizePx * 1.2;
}

/**
 * 多行标签：`tspan` 的 **`y`** 是 **alphabetic baseline**。若仅把「基线梯」的中点对准 **`cy`**，
 * 整段字形相对单行 **`dominant-baseline="middle"`**（em 中点）会**偏上**。
 * 将返回值加到第一行基线的 **`y`** 上，使墨迹垂直中心与 **`cy`** 对齐。
 */
export function mxLabelMultilineVisualCenterDyPx(
  fontSizePx: number,
  style: Map<string, string>,
  defaultFontStack?: string,
): number {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext("2d");
  if (!ctx) return fontSizePx * 0.25;
  ctx.font = canvasFontString(fontSizePx, style, defaultFontStack);
  const m = ctx.measureText("M");
  let asc = m.actualBoundingBoxAscent;
  let desc = m.actualBoundingBoxDescent;
  if (!Number.isFinite(asc) || !Number.isFinite(desc) || (asc <= 0 && desc <= 0)) {
    const ext = m as TextMetrics & {
      fontBoundingBoxAscent?: number;
      fontBoundingBoxDescent?: number;
    };
    asc = ext.fontBoundingBoxAscent ?? fontSizePx * 0.74;
    desc = ext.fontBoundingBoxDescent ?? fontSizePx * 0.26;
  }
  return (asc - desc) / 2;
}

/** 写入 `<text>` 的字体相关属性（已 XML 转义）。 */
export function svgFontAttrString(
  style: Map<string, string>,
  esc: (s: string) => string,
  defaultTailStack?: string,
): string {
  const bits = mxFontStyleBits(style);
  const attrs: string[] = [`font-family="${esc(svgFontStack(style, defaultTailStack))}"`];
  if ((bits & MX_FONT_BOLD) !== 0) attrs.push('font-weight="bold"');
  if ((bits & MX_FONT_ITALIC) !== 0) attrs.push('font-style="italic"');
  if ((bits & MX_FONT_UNDERLINE) !== 0) attrs.push('text-decoration="underline"');
  const lsRaw = style.get("letterspacing")?.trim();
  if (lsRaw != null && lsRaw !== "") {
    const ls = Number(lsRaw);
    if (Number.isFinite(ls)) attrs.push(`letter-spacing="${ls}"`);
  }
  return attrs.join(" ");
}
