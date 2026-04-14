import type { DiagramNode } from "../core/model.ts";
import {
  shapePathD,
  vertexLabelLayoutRect,
  vertexLabelPaddingFromStyle,
} from "../shape/shape-path.ts";
import { measureVertexLabelDisplayBlock, wrapVertexLabelToBoxWidth } from "../text/wrap-label.ts";
import {
  edgeLabelBackgroundLayout,
  edgeLabelContentCenter,
  edgeLabelSvgTextAnchor,
  parseEdgeLabelAlignH,
  parseEdgeLabelAlignV,
} from "./edge-label-layout.ts";
import { renderSvgLabelBlock } from "./label-svg.ts";
import type { GradientBuildContext } from "./svg-util.ts";
import {
  allocFill,
  allocRectClipPath,
  colorOr,
  dropShadowFilterId,
  esc,
  fillOpacityAttr,
  groupOpacityAttr,
  labelBackgroundStrokeAttrs,
  mxPaintColor,
  mxStyleDoubleEnabled,
  mxStyleFlipH,
  mxStyleFlipV,
  mxStyleLinkHref,
  mxStyleNoLabel,
  mxStyleOverflowHidden,
  mxStyleShadowEnabled,
  rectCornerRadius,
  strokeDashAttr,
  strokeMiterlimitAttr,
  strokeOpacityAttr,
  strokeWidthPx,
  vertexLineStrokeCapAttr,
  vertexOptionalStrokeCapJoinAttr,
  vertexPathStrokeCapJoinAttr,
  wrapSvgHyperlink,
} from "./svg-util.ts";

export function renderVertex(
  n: DiagramNode,
  g: GradientBuildContext,
  defaultFontStack?: string,
): string {
  const fillSolid = mxPaintColor(n.style, "fillcolor", "#dae8fc");
  const fill = allocFill(n.style, fillSolid, g);
  const stroke = mxPaintColor(n.style, "strokecolor", "#6c8ebf");
  const sw = strokeWidthPx(n.style, 1);
  const strokeNone = stroke === "none" || sw === 0;
  const fs = Number(n.style.get("fontsize") ?? "12") || 12;
  const dashAttr = strokeDashAttr(n.style);
  const fillOp = fillOpacityAttr(n.style);
  const strokeOp = strokeOpacityAttr(n.style);
  const paint2d = `${fillOp}${strokeOp}`;
  const parts: string[] = [];
  const miterAttr = strokeMiterlimitAttr(n.style);
  const isDouble = mxStyleDoubleEnabled(n.style) && !strokeNone;

  const pathD = shapePathD(n.shape, n.x, n.y, n.width, n.height, n.style);
  const pathCapJoin = vertexPathStrokeCapJoinAttr(n.style);
  const shapeCapJoin = vertexOptionalStrokeCapJoinAttr(n.style);
  const lineCap = vertexLineStrokeCapAttr(n.style, "round");

  if (pathD) {
    if (strokeNone) {
      parts.push(`<path d="${pathD}" fill="${fill}"${fillOp} stroke="none"/>`);
    } else {
      parts.push(
        `<path d="${pathD}" fill="${fill}" stroke="${esc(stroke)}" stroke-width="${sw}"${pathCapJoin}${dashAttr}${paint2d}${miterAttr}/>`,
      );
    }
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
    if (strokeNone) {
      parts.push(
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}"${fillOp} stroke="none" rx="${rx}" ry="${rx}"/>`,
      );
      parts.push(
        `<line x1="${n.x}" y1="${n.y + dy}" x2="${n.x + n.width}" y2="${n.y + dy}" stroke="none"${lineCap}/>`,
      );
      parts.push(
        `<line x1="${n.x + dx}" y1="${n.y}" x2="${n.x + dx}" y2="${n.y + n.height}" stroke="none"${lineCap}/>`,
      );
    } else {
      parts.push(
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="${esc(
          stroke,
        )}" stroke-width="${sw}" rx="${rx}" ry="${rx}"${dashAttr}${shapeCapJoin}${paint2d}${miterAttr}/>`,
      );
      const lineStroke = esc(stroke);
      parts.push(
        `<line x1="${n.x}" y1="${n.y + dy}" x2="${n.x + n.width}" y2="${n.y + dy}" stroke="${lineStroke}" stroke-width="${sw}"${lineCap}${strokeOp}/>`,
      );
      parts.push(
        `<line x1="${n.x + dx}" y1="${n.y}" x2="${n.x + dx}" y2="${n.y + n.height}" stroke="${lineStroke}" stroke-width="${sw}"${lineCap}${strokeOp}/>`,
      );
    }
  } else if (n.shape === "ellipse") {
    const cx = n.x + n.width / 2;
    const cy = n.y + n.height / 2;
    const rx = n.width / 2;
    const ry = n.height / 2;
    const strokeOnlyExtras = `${dashAttr}${shapeCapJoin}${strokeOp}${miterAttr}`;
    if (isDouble) {
      const inset = Math.max(2, sw);
      const irx = Math.max(0, rx - inset);
      const iry = Math.max(0, ry - inset);
      parts.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="none"${fillOp}/>`,
      );
      parts.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${esc(stroke)}" stroke-width="${sw}"${strokeOnlyExtras}/>`,
      );
      if (irx > 0 && iry > 0) {
        parts.push(
          `<ellipse cx="${cx}" cy="${cy}" rx="${irx}" ry="${iry}" fill="none" stroke="${esc(stroke)}" stroke-width="${sw}"${strokeOnlyExtras}/>`,
        );
      }
    } else if (strokeNone) {
      parts.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${fillOp} stroke="none"/>`,
      );
    } else {
      parts.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${esc(stroke)}" stroke-width="${sw}"${dashAttr}${shapeCapJoin}${paint2d}${miterAttr}/>`,
      );
    }
  } else {
    const rx = rectCornerRadius(n.style, n.width, n.height);
    const strokeOnlyExtras = `${dashAttr}${shapeCapJoin}${strokeOp}${miterAttr}`;
    if (isDouble) {
      const inset = Math.max(2, sw);
      const rxIn = Math.max(0, rx > 0 ? rx - inset : 0);
      const iw = Math.max(0, n.width - 2 * inset);
      const ih = Math.max(0, n.height - 2 * inset);
      parts.push(
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="none"${fillOp}/>`,
      );
      parts.push(
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="none" stroke="${esc(
          stroke,
        )}" stroke-width="${sw}" rx="${rx}" ry="${rx}"${strokeOnlyExtras}/>`,
      );
      if (iw > 0 && ih > 0) {
        parts.push(
          `<rect x="${n.x + inset}" y="${n.y + inset}" width="${iw}" height="${ih}" fill="none" stroke="${esc(
            stroke,
          )}" stroke-width="${sw}" rx="${rxIn}" ry="${rxIn}"${strokeOnlyExtras}/>`,
        );
      }
    } else if (strokeNone) {
      parts.push(
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}"${fillOp} stroke="none" rx="${rx}" ry="${rx}"/>`,
      );
    } else {
      parts.push(
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="${esc(
          stroke,
        )}" stroke-width="${sw}" rx="${rx}" ry="${rx}"${dashAttr}${shapeCapJoin}${paint2d}${miterAttr}/>`,
      );
    }
  }

  if (n.label.trim() && !mxStyleNoLabel(n.style)) {
    const pad = vertexLabelPaddingFromStyle(n.style);
    const contentMaxW = Math.max(1, n.width - pad.left - pad.right);
    const softWrap = n.style.get("whitespace") === "wrap";
    const wrap = softWrap
      ? wrapVertexLabelToBoxWidth(n.label, n.width, fs, 0, n.style, defaultFontStack, contentMaxW)
      : n.label;
    const { width: tw, height: th } = measureVertexLabelDisplayBlock(
      wrap,
      n.width,
      fs,
      0,
      softWrap,
      n.style,
      defaultFontStack,
      contentMaxW,
    );
    const rect = vertexLabelLayoutRect(n.shape, n.x, n.y, n.width, n.height, n.style, pad);
    const ah = parseEdgeLabelAlignH(n.style);
    const av = parseEdgeLabelAlignV(n.style);
    let ax = (rect.left + rect.right) / 2;
    let ay = (rect.top + rect.bottom) / 2;
    if (ah === "left") ax = rect.left;
    else if (ah === "right") ax = rect.right;
    if (av === "top") ay = rect.top;
    else if (av === "bottom") ay = rect.bottom;
    const anchor = { x: ax, y: ay };

    const labelBgKey = colorOr(n.style, "labelbackgroundcolor", "");
    const hasLabelBg = !!labelBgKey && labelBgKey !== "none";
    const labelPieces: string[] = [];
    let tcx: number;
    let tcy: number;
    if (hasLabelBg) {
      const bgPad = 4;
      const lay = edgeLabelBackgroundLayout(anchor, tw, th, bgPad, ah, av);
      tcx = lay.tcx;
      tcy = lay.tcy;
      labelPieces.push(
        `<rect x="${lay.bx}" y="${lay.by}" width="${lay.bw}" height="${lay.bh}" rx="4" ry="4" fill="${esc(labelBgKey)}"${fillOp}${labelBackgroundStrokeAttrs(n.style)}/>`,
      );
    } else {
      const c = edgeLabelContentCenter(anchor, tw, th, ah, av);
      tcx = c.x;
      tcy = c.y;
    }
    const labelFill = colorOr(n.style, "fontcolor", "#000000");
    labelPieces.push(
      renderSvgLabelBlock(tcx, tcy, fs, wrap, {
        fill: labelFill,
        style: n.style,
        defaultFontStack,
        textAnchor: edgeLabelSvgTextAnchor(ah),
        contentWidth: tw,
      }),
    );
    let labelBlock = labelPieces.join("");
    const href = mxStyleLinkHref(n.style);
    if (href) labelBlock = wrapSvgHyperlink(labelBlock, href);
    if (mxStyleOverflowHidden(n.style)) {
      const cw = Math.max(0, rect.right - rect.left);
      const ch = Math.max(0, rect.bottom - rect.top);
      const clipId = allocRectClipPath(g, rect.left, rect.top, cw, ch);
      labelBlock = `<g clip-path="url(#${clipId})">${labelBlock}</g>`;
    }
    parts.push(labelBlock);
  }

  const inner = parts.join("");
  const gOp = groupOpacityAttr(n.style);
  const filt = mxStyleShadowEnabled(n.style) ? ` filter="url(#${dropShadowFilterId()})"` : "";
  const rcx = n.x + n.width / 2;
  const rcy = n.y + n.height / 2;
  const fh = mxStyleFlipH(n.style) ? -1 : 1;
  const fv = mxStyleFlipV(n.style) ? -1 : 1;
  const needFlip = fh !== 1 || fv !== 1;
  const needRot = n.rotation !== 0;
  let innerWrapped = inner;
  if (needRot && !needFlip) {
    innerWrapped = `<g transform="rotate(${n.rotation}, ${rcx}, ${rcy})">${inner}</g>`;
  } else if (needFlip) {
    const tr: string[] = [`translate(${rcx}, ${rcy})`];
    if (needRot) tr.push(`rotate(${n.rotation})`);
    tr.push(`scale(${fh}, ${fv})`);
    tr.push(`translate(${-rcx}, ${-rcy})`);
    innerWrapped = `<g transform="${tr.join(" ")}">${inner}</g>`;
  }
  const titleEl = n.tooltip?.trim() ? `<title>${esc(n.tooltip.trim())}</title>` : "";
  return `<g data-mx2svg-id="${esc(n.id)}"${gOp}${filt}>${titleEl}${innerWrapped}</g>`;
}
