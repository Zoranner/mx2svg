import type { DiagramEdge } from "../core/model.ts";
import {
  edgeArrowSizeScale,
  markerEndAttr,
  markerStartAttr,
  parseEndArrow,
  parseStartArrow,
} from "../edge/edge-arrow.ts";
import { measureVertexLabelDisplayBlock, wrapVertexLabelToBoxWidth } from "../text/wrap-label.ts";
import { edgeLabelAnchor } from "./edge-label-anchor.ts";
import {
  edgeLabelBackgroundLayout,
  edgeLabelClipBounds,
  edgeLabelContentCenter,
  edgeLabelSvgTextAnchor,
  parseEdgeLabelAlignH,
  parseEdgeLabelAlignV,
} from "./edge-label-layout.ts";
import type { EdgeLineMetrics } from "./edge-line-metrics.ts";
import { renderSvgLabelBlock } from "./label-svg.ts";
import type { PageBakeOrigin } from "./page-bake.ts";
import { bakeX, bakeY, shiftPathD } from "./page-bake.ts";
import {
  allocRectClipPath,
  colorOr,
  edgeStrokeCapJoinAttr,
  esc,
  fillOpacityAttr,
  type GradientBuildContext,
  groupOpacityAttr,
  labelBackgroundStrokeAttrs,
  mxPaintColor,
  mxStyleLinkHref,
  mxStyleNoLabel,
  mxStyleOverflowHidden,
  strokeDashAttr,
  strokeMiterlimitAttr,
  strokeOpacityAttr,
  strokeWidthPx,
  wrapSvgHyperlink,
} from "./svg-util.ts";

export function renderEdge(
  e: DiagramEdge,
  m: EdgeLineMetrics,
  g: GradientBuildContext,
  bake: PageBakeOrigin,
  defaultFontStack?: string,
): string {
  let strokeRaw = mxPaintColor(e.style, "strokecolor", "#000000");
  let sw = strokeWidthPx(e.style, 1);
  const shapeLower = (e.style.get("shape") ?? "").toLowerCase();
  const isFlexArrow = shapeLower === "flexarrow";
  if (isFlexArrow && (strokeRaw === "none" || sw === 0)) {
    const fillFallback = mxPaintColor(e.style, "fillcolor", "#888888");
    strokeRaw = fillFallback !== "none" ? fillFallback : "#888888";
    if (sw === 0) sw = 1;
  }
  const strokeNone = strokeRaw === "none" || sw === 0;
  const stroke = strokeNone ? "none" : strokeRaw;
  const fs = Number(e.style.get("fontsize") ?? "11") || 11;
  const dashAttr = strokeDashAttr(e.style, sw);
  const strokeVisible = !strokeNone;
  const scaleEnd = edgeArrowSizeScale(e.style, true);
  const scaleStart = edgeArrowSizeScale(e.style, false);
  const markerEnd = strokeVisible ? markerEndAttr(parseEndArrow(e.style), strokeRaw, scaleEnd) : "";
  const markerStart = strokeVisible
    ? markerStartAttr(parseStartArrow(e.style), strokeRaw, scaleStart)
    : "";
  const strokeOp = strokeOpacityAttr(e.style);
  const miterAttr = strokeMiterlimitAttr(e.style);

  const pathD = m.pathD != null ? shiftPathD(m.pathD, bake.ox, bake.oy) : null;
  const capJoin = edgeStrokeCapJoinAttr(e.style);
  const lineStroke = strokeNone
    ? ' stroke="none"'
    : ` stroke="${esc(stroke)}" stroke-width="${sw}"`;
  const linePaint = strokeNone ? "" : `${capJoin}${dashAttr}${strokeOp}${miterAttr}`;
  const lineEl =
    pathD != null
      ? `<path d="${esc(pathD)}" fill="none"${lineStroke}${linePaint}${markerStart}${markerEnd}/>`
      : `<polyline points="${(m.polylinePoints ?? e.points)
          .map((p) => `${bakeX(bake, p.x)},${bakeY(bake, p.y)}`)
          .join(" ")}" fill="none"${lineStroke}${linePaint}${markerStart}${markerEnd}/>`;

  const parts: string[] = [lineEl];

  if (e.label.trim() && !mxStyleNoLabel(e.style)) {
    const labelLink = mxStyleLinkHref(e.style);
    const anchorRaw = edgeLabelAnchor(e, m.metricsPolyline);
    const anchor = { x: bakeX(bake, anchorRaw.x), y: bakeY(bake, anchorRaw.y) };
    const labelFill = colorOr(e.style, "fontcolor", "#000000");
    const softWrap = e.style.get("whitespace") === "wrap";
    const wrapBoxW =
      e.labelWrapWidth ??
      (softWrap ? Math.max(56, Math.round(fs * 6.5)) : Number.POSITIVE_INFINITY);
    const displayLabel = softWrap
      ? wrapVertexLabelToBoxWidth(e.label, wrapBoxW, fs, 0, e.style, defaultFontStack)
      : e.label;
    const measureBoxW = Number.isFinite(wrapBoxW) ? wrapBoxW : 1e9;
    const { width: tw, height: th } = measureVertexLabelDisplayBlock(
      displayLabel,
      measureBoxW,
      fs,
      0,
      softWrap,
      e.style,
      defaultFontStack,
    );
    const ah = parseEdgeLabelAlignH(e.style);
    const av = parseEdgeLabelAlignV(e.style);
    const labelBgKey = e.style.get("labelbackgroundcolor");
    const hasLabelBg = !!labelBgKey && labelBgKey !== "none";
    let tcx = anchor.x;
    let tcy = anchor.y;
    const labelParts: string[] = [];
    let lay: ReturnType<typeof edgeLabelBackgroundLayout> | null = null;
    if (hasLabelBg) {
      const bgPad = 4;
      lay = edgeLabelBackgroundLayout(anchor, tw, th, bgPad, ah, av);
      tcx = lay.tcx;
      tcy = lay.tcy;
      labelParts.push(
        `<rect x="${lay.bx}" y="${lay.by}" width="${lay.bw}" height="${lay.bh}" rx="4" ry="4" fill="${esc(labelBgKey)}"${fillOpacityAttr(e.style)}${labelBackgroundStrokeAttrs(e.style)}/>`,
      );
    } else {
      const c = edgeLabelContentCenter(anchor, tw, th, ah, av);
      tcx = c.x;
      tcy = c.y;
    }
    labelParts.push(
      renderSvgLabelBlock(tcx, tcy, fs, displayLabel, {
        contrastStroke: !hasLabelBg,
        fill: labelFill,
        style: e.style,
        defaultFontStack,
        textAnchor: edgeLabelSvgTextAnchor(ah),
        contentWidth: tw,
      }),
    );
    let labelBlock = labelParts.join("");
    if (labelLink) labelBlock = wrapSvgHyperlink(labelBlock, labelLink);
    if (mxStyleOverflowHidden(e.style)) {
      const b = edgeLabelClipBounds(anchor, tw, th, ah, av, hasLabelBg, lay);
      const clipId = allocRectClipPath(g, b.x, b.y, b.w, b.h);
      labelBlock = `<g clip-path="url(#${clipId})">${labelBlock}</g>`;
    }
    parts.push(labelBlock);
  }

  const titleEl = e.tooltip?.trim() ? `<title>${esc(e.tooltip.trim())}</title>` : "";
  return `<g data-mx2svg-edge="${esc(e.id)}"${groupOpacityAttr(e.style)}>${titleEl}${parts.join(
    "",
  )}</g>`;
}
