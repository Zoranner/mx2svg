import type { DiagramEdge } from "../core/model.ts";
import {
  markerEndAttr,
  markerStartAttr,
  parseEndArrow,
  parseStartArrow,
} from "../edge/edge-arrow.ts";
import { measureVertexLabelDisplayBlock, wrapVertexLabelToBoxWidth } from "../text/wrap-label.ts";
import { edgeLabelAnchor } from "./edge-label-anchor.ts";
import type { EdgeLineMetrics } from "./edge-line-metrics.ts";
import { renderSvgLabelBlock } from "./label-svg.ts";
import { colorOr, esc, strokeDashAttr } from "./svg-util.ts";

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
    const labelBgKey = e.style.get("labelbackgroundcolor");
    const hasLabelBg = !!labelBgKey && labelBgKey !== "none";
    if (hasLabelBg) {
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
      const pad = 4;
      const bw = tw + pad * 2;
      const bh = th + pad * 2;
      const bx = anchor.x - bw / 2;
      const by = anchor.y - bh / 2;
      parts.push(
        `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="4" ry="4" fill="${esc(labelBgKey)}"/>`,
      );
    }
    parts.push(
      renderSvgLabelBlock(anchor.x, anchor.y, fs, displayLabel, {
        contrastStroke: !hasLabelBg,
        fill: labelFill,
        style: e.style,
        defaultFontStack,
      }),
    );
  }

  return `<g data-mx2svg-edge="${esc(e.id)}">${parts.join("")}</g>`;
}
