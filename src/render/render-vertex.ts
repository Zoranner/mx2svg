import type { DiagramNode } from "../model.ts";
import { shapePathD, vertexLabelCenter } from "../shape-path.ts";
import { measureVertexLabelDisplayBlock, wrapVertexLabelToBoxWidth } from "../wrap-label.ts";
import { renderSvgLabelBlock } from "./label-svg.ts";
import type { GradientBuildContext } from "./svg-util.ts";
import { allocFill, colorOr, esc, rectCornerRadius, strokeDashAttr } from "./svg-util.ts";

export function renderVertex(
  n: DiagramNode,
  g: GradientBuildContext,
  defaultFontStack?: string,
): string {
  const fillSolid = colorOr(n.style, "fillcolor", "#dae8fc");
  const fill = allocFill(n.style, fillSolid, g);
  const stroke = colorOr(n.style, "strokecolor", "#6c8ebf");
  const sw = Number(n.style.get("strokewidth") ?? "1") || 1;
  const fs = Number(n.style.get("fontsize") ?? "12") || 12;
  const dashAttr = strokeDashAttr(n.style);
  const parts: string[] = [];

  const pathD = shapePathD(n.shape, n.x, n.y, n.width, n.height, n.style);
  if (pathD) {
    parts.push(
      `<path d="${pathD}" fill="${fill}" stroke="${esc(stroke)}" stroke-width="${sw}" stroke-linejoin="round"${dashAttr}/>`,
    );
  } else if (n.shape === "internalStorage") {
    const rounded = n.style.get("rounded") === "1" || n.style.get("rounded") === "true";
    const arcFrac = (Number(n.style.get("arcsize")) || 15) / 100;
    let inset = 0;
    if (rounded) {
      inset = Math.max(inset, Math.min(n.width * arcFrac, n.height * arcFrac));
    }
    const dx = Math.max(inset, Math.min(n.width, Number(n.style.get("dx")) || 15));
    const dy = Math.max(inset, Math.min(n.height, Number(n.style.get("dy")) || 15));
    const rx = rounded ? Math.min(n.width * arcFrac, n.height * arcFrac) : 0;
    parts.push(
      `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="${esc(
        stroke,
      )}" stroke-width="${sw}" rx="${rx}" ry="${rx}"${dashAttr}/>`,
    );
    const lineStroke = esc(stroke);
    parts.push(
      `<line x1="${n.x}" y1="${n.y + dy}" x2="${n.x + n.width}" y2="${n.y + dy}" stroke="${lineStroke}" stroke-width="${sw}" stroke-linecap="round"/>`,
    );
    parts.push(
      `<line x1="${n.x + dx}" y1="${n.y}" x2="${n.x + dx}" y2="${n.y + n.height}" stroke="${lineStroke}" stroke-width="${sw}" stroke-linecap="round"/>`,
    );
  } else if (n.shape === "ellipse") {
    const cx = n.x + n.width / 2;
    const cy = n.y + n.height / 2;
    const rx = n.width / 2;
    const ry = n.height / 2;
    parts.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${esc(stroke)}" stroke-width="${sw}"${dashAttr}/>`,
    );
  } else {
    const rx = rectCornerRadius(n.style, n.width, n.height);
    parts.push(
      `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="${esc(
        stroke,
      )}" stroke-width="${sw}" rx="${rx}" ry="${rx}"${dashAttr}/>`,
    );
  }

  if (n.label.trim()) {
    const { cx: tx, cy: ty } = vertexLabelCenter(n.shape, n.x, n.y, n.width, n.height, n.style);
    const labelInset = 8;
    const softWrap = n.style.get("whitespace") === "wrap";
    const wrap = softWrap
      ? wrapVertexLabelToBoxWidth(n.label, n.width, fs, labelInset, n.style, defaultFontStack)
      : n.label;
    const labelBg = colorOr(n.style, "labelbackgroundcolor", "");
    if (labelBg && labelBg !== "none") {
      const { width: tw, height: th } = measureVertexLabelDisplayBlock(
        wrap,
        n.width,
        fs,
        labelInset,
        softWrap,
        n.style,
        defaultFontStack,
      );
      const pad = 4;
      const bw = tw + pad * 2;
      const bh = th + pad * 2;
      const bx = tx - bw / 2;
      const by = ty - bh / 2;
      parts.push(
        `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="4" ry="4" fill="${esc(labelBg)}"/>`,
      );
    }
    const labelFill = colorOr(n.style, "fontcolor", "#000000");
    parts.push(
      renderSvgLabelBlock(tx, ty, fs, wrap, { fill: labelFill, style: n.style, defaultFontStack }),
    );
  }

  const inner = parts.join("");
  if (n.rotation !== 0) {
    const rcx = n.x + n.width / 2;
    const rcy = n.y + n.height / 2;
    return `<g data-mx2svg-id="${esc(n.id)}"><g transform="rotate(${n.rotation}, ${rcx}, ${rcy})">${inner}</g></g>`;
  }
  return `<g data-mx2svg-id="${esc(n.id)}">${inner}</g>`;
}
