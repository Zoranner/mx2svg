import type { DiagramEdge } from "../core/model.ts";
import { asArray, numAttr, strAttr } from "./xml-helpers.ts";

export function parseGeometry(
  geo: Record<string, unknown> | undefined,
): { x: number; y: number; width: number; height: number } | null {
  if (!geo || typeof geo !== "object") return null;
  const w = numAttr(geo, "width", NaN);
  const h = numAttr(geo, "height", NaN);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }
  return {
    x: numAttr(geo, "x", 0),
    y: numAttr(geo, "y", 0),
    width: w,
    height: h,
  };
}

export function parseMxPoint(obj: Record<string, unknown>): { x: number; y: number } | null {
  const x = numAttr(obj, "x", NaN);
  const y = numAttr(obj, "y", NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/** 从边的 mxGeometry 提取折线点（sourcePoint → Array points → targetPoint）。 */
export function edgePointsFromGeometry(
  geo: Record<string, unknown> | undefined,
): { x: number; y: number }[] | null {
  if (!geo) return null;

  const allMxPoints = asArray<Record<string, unknown>>(
    geo.mxPoint as Record<string, unknown> | Record<string, unknown>[],
  );
  let source: { x: number; y: number } | undefined;
  let target: { x: number; y: number } | undefined;
  const loose: { x: number; y: number }[] = [];

  for (const o of allMxPoints) {
    const p = parseMxPoint(o);
    if (!p) continue;
    const as = strAttr(o, "as");
    if (as === "sourcePoint") source = p;
    else if (as === "targetPoint") target = p;
    else loose.push(p);
  }

  const arrayPoints: { x: number; y: number }[] = [];
  const arrRaw = geo.Array;
  if (arrRaw && typeof arrRaw === "object" && !Array.isArray(arrRaw)) {
    const inner = asArray<Record<string, unknown>>(
      (arrRaw as Record<string, unknown>).mxPoint as
        | Record<string, unknown>
        | Record<string, unknown>[],
    );
    for (const o of inner) {
      const p = parseMxPoint(o);
      if (p) arrayPoints.push(p);
    }
  }

  const parts: { x: number; y: number }[] = [];
  if (source) parts.push(source);
  parts.push(...arrayPoints);
  if (target) parts.push(target);

  if (parts.length >= 2) return parts;
  if (loose.length >= 2) return loose;
  if (source && target) return [source, target];
  return null;
}

export function mxPointByAs(
  geo: Record<string, unknown> | undefined,
  targetAs: string,
): { x: number; y: number } | null {
  if (!geo) return null;
  const list = asArray<Record<string, unknown>>(
    geo.mxPoint as Record<string, unknown> | Record<string, unknown>[],
  );
  for (const o of list) {
    if (strAttr(o, "as") === targetAs) {
      return parseMxPoint(o);
    }
  }
  return null;
}

/** 边标签几何：比例/中点偏移在渲染阶段用最终路径（含跳线）计算。 */
export function parseEdgeLabelFields(
  geo: Record<string, unknown> | undefined,
): Pick<DiagramEdge, "labelPosition" | "edgeLabelPath" | "edgeLabelMidOffset"> {
  const out: Pick<DiagramEdge, "labelPosition" | "edgeLabelPath" | "edgeLabelMidOffset"> = {};
  if (!geo) return out;

  const labelMx = mxPointByAs(geo, "label");
  if (labelMx && (labelMx.x !== 0 || labelMx.y !== 0)) {
    const { x: lx, y: ly } = labelMx;
    if (lx >= 0 && lx <= 1) {
      out.edgeLabelPath = { fraction: lx, normalOffset: ly };
    } else {
      out.labelPosition = { x: lx, y: ly };
    }
    return out;
  }

  if (strAttr(geo, "relative") === "1") {
    const ox = numAttr(geo, "x", 0);
    const oy = numAttr(geo, "y", 0);
    if (ox !== 0 || oy !== 0) {
      out.edgeLabelMidOffset = { dx: ox, dy: oy };
    }
  }

  return out;
}

/**
 * `edgeLabel` 子 cell 的 mxGeometry：`relative` + `x,y`，可选 **`mxPoint as="offset"`**。
 * **`x` 在 [0,1]** 时视为沿路径比例，与 **`edgeLabelMidOffset`** 可并存（锚点先按比例再平移）。
 */
export function parseEdgeLabelChildGeometry(
  geo: Record<string, unknown> | undefined,
): Pick<DiagramEdge, "labelPosition" | "edgeLabelPath" | "edgeLabelMidOffset"> {
  if (!geo) return {};

  const offsetPt = mxPointByAs(geo, "offset");
  const ox = offsetPt?.x ?? 0;
  const oy = offsetPt?.y ?? 0;

  const labelMx = mxPointByAs(geo, "label");
  if (labelMx && (labelMx.x !== 0 || labelMx.y !== 0)) {
    const { x: lx, y: ly } = labelMx;
    if (lx >= 0 && lx <= 1) {
      const out: Pick<DiagramEdge, "edgeLabelPath" | "edgeLabelMidOffset"> = {
        edgeLabelPath: { fraction: lx, normalOffset: ly },
      };
      if (ox !== 0 || oy !== 0) out.edgeLabelMidOffset = { dx: ox, dy: oy };
      return out;
    }
    return { labelPosition: { x: lx, y: ly } };
  }

  if (strAttr(geo, "relative") === "1") {
    const x = numAttr(geo, "x", 0);
    const y = numAttr(geo, "y", 0);
    if (x >= 0 && x <= 1) {
      const out: Pick<DiagramEdge, "edgeLabelPath" | "edgeLabelMidOffset"> = {
        edgeLabelPath: { fraction: x, normalOffset: y },
      };
      if (ox !== 0 || oy !== 0) out.edgeLabelMidOffset = { dx: ox, dy: oy };
      return out;
    }
    if (x !== 0 || y !== 0 || ox !== 0 || oy !== 0) {
      return { edgeLabelMidOffset: { dx: x + ox, dy: y + oy } };
    }
  }

  if (ox !== 0 || oy !== 0) {
    return { edgeLabelMidOffset: { dx: ox, dy: oy } };
  }
  return {};
}
