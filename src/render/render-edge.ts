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
  edgeLabelContentCenter,
  edgeLabelSvgTextAnchor,
  parseEdgeLabelAlignH,
  parseEdgeLabelAlignV,
} from "./edge-label-layout.ts";
import type { EdgeLineMetrics } from "./edge-line-metrics.ts";
import { renderSvgLabelBlock } from "./label-svg.ts";
import {
  colorOr,
  edgeStrokeCapJoinAttr,
  esc,
  fillOpacityAttr,
  groupOpacityAttr,
  labelBackgroundStrokeAttrs,
  mxPaintColor,
  mxStyleLinkHref,
  strokeDashAttr,
  strokeMiterlimitAttr,
  strokeOpacityAttr,
  strokeWidthPx,
  wrapSvgHyperlink,
} from "./svg-util.ts";

export function renderEdge(e: DiagramEdge, m: EdgeLineMetrics, defaultFontStack?: string): string {
  const strokeRaw = mxPaintColor(e.style, "strokecolor", "#000000");
  const sw = strokeWidthPx(e.style, 1);
  const strokeNone = strokeRaw === "none" || sw === 0;
  const stroke = strokeNone ? "none" : strokeRaw;
  const fs = Number(e.style.get("fontsize") ?? "11") || 11;
  const dashAttr = strokeDashAttr(e.style);
  const strokeVisible = !strokeNone;
  const scaleEnd = edgeArrowSizeScale(e.style, true);
  const scaleStart = edgeArrowSizeScale(e.style, false);
  const markerEnd = strokeVisible ? markerEndAttr(parseEndArrow(e.style), strokeRaw, scaleEnd) : "";
  const markerStart = strokeVisible
    ? markerStartAttr(parseStartArrow(e.style), strokeRaw, scaleStart)
    : "";
  const strokeOp = strokeOpacityAttr(e.style);
  const miterAttr = strokeMiterlimitAttr(e.style);

  const pathD = m.pathD;
  const capJoin = edgeStrokeCapJoinAttr(e.style);
  const lineStroke = strokeNone
    ? ' stroke="none"'
    : ` stroke="${esc(stroke)}" stroke-width="${sw}"`;
  const linePaint = strokeNone ? "" : `${capJoin}${dashAttr}${strokeOp}${miterAttr}`;
  const lineEl =
    pathD != null
      ? `<path d="${esc(pathD)}" fill="none"${lineStroke}${linePaint}${markerStart}${markerEnd}/>`
      : `<polyline points="${(m.polylinePoints ?? e.points).map((p) => `${p.x},${p.y}`).join(" ")}" fill="none"${lineStroke}${linePaint}${markerStart}${markerEnd}/>`;

  const parts: string[] = [lineEl];

  if (e.label.trim()) {
    const labelLink = mxStyleLinkHref(e.style);
    const anchor = edgeLabelAnchor(e, m.metricsPolyline);
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
    if (hasLabelBg) {
      const bgPad = 4;
      const lay = edgeLabelBackgroundLayout(anchor, tw, th, bgPad, ah, av);
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
    parts.push(labelBlock);
  }

  const titleEl = e.tooltip?.trim() ? `<title>${esc(e.tooltip.trim())}</title>` : "";
  return `<g data-mx2svg-edge="${esc(e.id)}"${groupOpacityAttr(e.style)}>${titleEl}${parts.join(
    "",
  )}</g>`;
}
