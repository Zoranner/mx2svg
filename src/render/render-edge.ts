import type { DiagramEdge } from "../core/model.ts";
import {
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
import { colorOr, esc, groupOpacityAttr, strokeDashAttr } from "./svg-util.ts";

export function renderEdge(e: DiagramEdge, m: EdgeLineMetrics, defaultFontStack?: string): string {
  const stroke = colorOr(e.style, "strokecolor", "#000000");
  const sw = Number(e.style.get("strokewidth") ?? "1") || 1;
  const fs = Number(e.style.get("fontsize") ?? "11") || 11;
  const dashAttr = strokeDashAttr(e.style);
  const markerEnd = markerEndAttr(parseEndArrow(e.style), stroke);
  const markerStart = markerStartAttr(parseStartArrow(e.style), stroke);

  const pathD = m.pathD;
  const lineEl =
    pathD != null
      ? `<path d="${esc(pathD)}" fill="none" stroke="${esc(
          stroke,
        )}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dashAttr}${markerStart}${markerEnd}/>`
      : `<polyline points="${(m.polylinePoints ?? e.points).map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${esc(
          stroke,
        )}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dashAttr}${markerStart}${markerEnd}/>`;

  const parts: string[] = [lineEl];

  if (e.label.trim()) {
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
    if (hasLabelBg) {
      const pad = 4;
      const lay = edgeLabelBackgroundLayout(anchor, tw, th, pad, ah, av);
      tcx = lay.tcx;
      tcy = lay.tcy;
      parts.push(
        `<rect x="${lay.bx}" y="${lay.by}" width="${lay.bw}" height="${lay.bh}" rx="4" ry="4" fill="${esc(labelBgKey)}"/>`,
      );
    } else {
      const c = edgeLabelContentCenter(anchor, tw, th, ah, av);
      tcx = c.x;
      tcy = c.y;
    }
    parts.push(
      renderSvgLabelBlock(tcx, tcy, fs, displayLabel, {
        contrastStroke: !hasLabelBg,
        fill: labelFill,
        style: e.style,
        defaultFontStack,
        textAnchor: edgeLabelSvgTextAnchor(ah),
        contentWidth: tw,
      }),
    );
  }

  return `<g data-mx2svg-edge="${esc(e.id)}"${groupOpacityAttr(e.style)}>${parts.join("")}</g>`;
}
