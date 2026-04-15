/** 与 `renderToSvg` 一并传入的选项。 */
export interface RenderOptions {
  /** 渲染第几页（0-based），默认 0 */
  pageIndex?: number;
  padding?: number;
  backgroundColor?: string;
  /**
   * 未设置 `fontFamily`（或 `default`）的单元格使用的 `font-family` 栈，与 draw.io 主题/嵌入场景对齐。
   * 例：`"Inter, system-ui, sans-serif"`。不设时与库内 `Arial, Helvetica, sans-serif` 一致。
   */
  defaultFontStack?: string;
  /** 顶点 style 无 `fontSize` / `fontsize` 时的字号（px），默认 **12**。 */
  defaultVertexFontSize?: number;
  /** 边 style 无 `fontSize` / `fontsize` 时的字号（px），默认 **11**。 */
  defaultEdgeFontSize?: number;
}
