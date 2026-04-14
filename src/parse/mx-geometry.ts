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
  /** 仅 `Array` 路点、无 `sourcePoint`/`targetPoint`：可只有 1 个中间点，由解析阶段再接源/目标周界。 */
  if (arrayPoints.length >= 1 && !source && !target) return arrayPoints;
  if (loose.length >= 2) return loose;
  if (source && target) return [source, target];
  return null;
}

/** `mxPoint as="sourcePoint"` / `targetPoint` 已给出绝对端点时为 true。 */
export function edgeGeometryHasExplicitTerminals(
  geo: Record<string, unknown> | undefined,
): boolean {
  if (!geo) return false;
  const allMxPoints = asArray<Record<string, unknown>>(
    geo.mxPoint as Record<string, unknown> | Record<string, unknown>[],
  );
  for (const o of allMxPoints) {
    const as = strAttr(o, "as");
    if (as === "sourcePoint" || as === "targetPoint") return true;
  }
  return false;
}

/** `Array as="points"` 中路点条数。 */
export function edgeArrayWaypointCount(geo: Record<string, unknown> | undefined): number {
  if (!geo) return 0;
  const arrRaw = geo.Array;
  if (!arrRaw || typeof arrRaw !== "object" || Array.isArray(arrRaw)) return 0;
  const inner = asArray<Record<string, unknown>>(
    (arrRaw as Record<string, unknown>).mxPoint as
      | Record<string, unknown>
      | Record<string, unknown>[],
  );
  let n = 0;
  for (const o of inner) {
    if (parseMxPoint(o)) n++;
  }
  return n;
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

/**
 * mxGraph `mxGeometry` 边标签（`relative=1`）：`x` 在 [-1,1] 表示沿路径相对几何中点的位移（-1=源端、0=中点、+1=目标端）；`y` 为法向像素偏移。
 * 本库 `edgeLabelPath.fraction` 为从源到目标的弧长比例 [0,1]，故 `t = (x+1)/2`。
 *
 * @see https://jgraph.github.io/mxgraph/docs/js-api/files/model/mxGeometry-js.html Edge Labels
 */
export function mxEdgeLabelRelativeXToArcFraction(x: number): number | null {
  if (x < -1 || x > 1) return null;
  return Math.max(0, Math.min(1, (x + 1) / 2));
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
    const t = mxEdgeLabelRelativeXToArcFraction(lx);
    if (t !== null) {
      out.edgeLabelPath = { fraction: t, normalOffset: ly };
    } else {
      out.labelPosition = { x: lx, y: ly };
    }
    return out;
  }

  if (strAttr(geo, "relative") === "1") {
    const ox = numAttr(geo, "x", 0);
    const oy = numAttr(geo, "y", 0);
    const t = mxEdgeLabelRelativeXToArcFraction(ox);
    if (t !== null && (ox !== 0 || oy !== 0)) {
      out.edgeLabelPath = { fraction: t, normalOffset: oy };
      return out;
    }
    if (ox !== 0 || oy !== 0) {
      out.edgeLabelMidOffset = { dx: ox, dy: oy };
    }
  }

  return out;
}

/**
 * `edgeLabel` 子 cell 的 mxGeometry：`relative` + `x,y`（mxGraph：`x` 在 [-1,1] 相对边中心沿路径），可选 `mxPoint as="offset"`（像素平移）。
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
    const t = mxEdgeLabelRelativeXToArcFraction(lx);
    if (t !== null) {
      const out: Pick<DiagramEdge, "edgeLabelPath" | "edgeLabelMidOffset"> = {
        edgeLabelPath: { fraction: t, normalOffset: ly },
      };
      if (ox !== 0 || oy !== 0) out.edgeLabelMidOffset = { dx: ox, dy: oy };
      return out;
    }
    return { labelPosition: { x: lx, y: ly } };
  }

  if (strAttr(geo, "relative") === "1") {
    const x = numAttr(geo, "x", 0);
    const y = numAttr(geo, "y", 0);
    const t = mxEdgeLabelRelativeXToArcFraction(x);
    if (t !== null) {
      const out: Pick<DiagramEdge, "edgeLabelPath" | "edgeLabelMidOffset"> = {
        edgeLabelPath: { fraction: t, normalOffset: y },
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
