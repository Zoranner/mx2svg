import { describe, expect, test } from "bun:test";
import type { DiagramNode } from "../core/model.ts";
import { snapEdgePointsToConnectionHints } from "./edge-endpoints.ts";
import { parseMxStyle } from "./style.ts";

function node(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  shape: DiagramNode["shape"],
): DiagramNode {
  return {
    id,
    parentId: null,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    label: "",
    shape,
    style: new Map(),
  };
}

describe("snapEdgePointsToConnectionHints", () => {
  test("replaces stale geometry endpoints using exit/entry ratios on cloud and rect", () => {
    const cloud = node("c", 100, 50, 150, 95, "cloud");
    const rect = node("r", 280, 30, 120, 50, "rect");
    const nodeById = new Map<string, DiagramNode>([
      ["c", cloud],
      ["r", rect],
    ]);
    const style = parseMxStyle(
      "endArrow=classic;html=1;exitX=0.864;exitY=0.265;entryX=0;entryY=0.5;",
    );
    const stale: { x: number; y: number }[] = [
      { x: 227.24, y: 74.77 },
      { x: 293.24, y: 82.81 },
    ];
    const out = snapEdgePointsToConnectionHints(stale, {
      source: "c",
      target: "r",
      style,
      nodeById,
    });
    expect(out.length).toBe(2);
    /** 云形锚点沿射线外延，与导出中偏内的 stale 端点应有可辨差异 */
    expect(Math.hypot(out[0]!.x - stale[0]!.x, out[0]!.y - stale[0]!.y)).toBeGreaterThan(3);
    expect(Math.hypot(out[1]!.x - stale[1]!.x, out[1]!.y - stale[1]!.y)).toBeGreaterThan(1);
    const leftMid = { x: rect.x, y: rect.y + rect.height / 2 };
    expect(Math.hypot(out[1]!.x - leftMid.x, out[1]!.y - leftMid.y)).toBeLessThan(2);
  });

  test("target only + geometryExplicitTerminals + entry: redirects end toward target aim, chord capped", () => {
    const cloud = node("c", 3138.5, 226, 150, 95, "cloud");
    const nodeById = new Map<string, DiagramNode>([["c", cloud]]);
    const style = parseMxStyle(
      "shape=flexArrow;endArrow=classic;entryX=0.108;entryY=0.621;entryPerimeter=0;",
    );
    const stale: { x: number; y: number }[] = [
      { x: 2990, y: 286 },
      { x: 3080, y: 276 },
    ];
    const out = snapEdgePointsToConnectionHints(stale, {
      target: "c",
      style,
      nodeById,
      geometryExplicitTerminals: true,
    });
    expect(out[0]).toEqual(stale[0]);
    const L0 = Math.hypot(stale[1]!.x - stale[0]!.x, stale[1]!.y - stale[0]!.y);
    const L1 = Math.hypot(out[1]!.x - out[0]!.x, out[1]!.y - out[0]!.y);
    expect(L1).toBeLessThanOrEqual(L0 + 1e-6);
    const cc = { x: 3138.5 + 75, y: 226 + 47.5 };
    expect(Math.hypot(out[1]!.x - cc.x, out[1]!.y - cc.y)).toBeLessThan(
      Math.hypot(stale[1]!.x - cc.x, stale[1]!.y - cc.y),
    );
  });

  test("target only + explicit: stale targetPoint in title band is steered toward cloud", () => {
    const cloud = node("c", 3138.5, 226, 150, 95, "cloud");
    const nodeById = new Map<string, DiagramNode>([["c", cloud]]);
    const style = parseMxStyle("endArrow=classic;html=1;rounded=0;");
    const p0 = { x: 3138.5, y: 230.96 };
    const pL = { x: 3208.5, y: 190.96 };
    const out = snapEdgePointsToConnectionHints([p0, pL], {
      target: "c",
      style,
      nodeById,
      geometryExplicitTerminals: true,
    });
    expect(out[0]).toEqual(p0);
    expect(out[1]!.y).toBeGreaterThan(220);
    expect(out[1]!.y).toBeGreaterThan(pL.y + 30);
  });

  test("target only + no explicit terminals: entry ratios snap end onto cloud perimeter", () => {
    const cloud = node("c", 3138.5, 226, 150, 95, "cloud");
    const nodeById = new Map<string, DiagramNode>([["c", cloud]]);
    const style = parseMxStyle(
      "shape=flexArrow;endArrow=classic;entryX=0.108;entryY=0.621;entryPerimeter=0;",
    );
    const stale: { x: number; y: number }[] = [
      { x: 2990, y: 286 },
      { x: 3080, y: 276 },
    ];
    const out = snapEdgePointsToConnectionHints(stale, {
      target: "c",
      style,
      nodeById,
      geometryExplicitTerminals: false,
    });
    expect(out[0]).toEqual(stale[0]);
    expect(Math.hypot(out[1]!.x - stale[1]!.x, out[1]!.y - stale[1]!.y)).toBeGreaterThan(2);
  });

  test("target only: without entry, end snaps from center toward free endpoint", () => {
    const cloud = node("c", 100, 50, 150, 95, "cloud");
    const nodeById = new Map<string, DiagramNode>([["c", cloud]]);
    const style = parseMxStyle("endArrow=classic;html=1;rounded=0;");
    const free = { x: 30, y: 120 };
    const staleEnd = { x: 180, y: 70 };
    const out = snapEdgePointsToConnectionHints([free, staleEnd], {
      target: "c",
      style,
      nodeById,
      geometryExplicitTerminals: false,
    });
    expect(out[0]).toEqual(free);
    expect(Math.hypot(out[1]!.x - staleEnd.x, out[1]!.y - staleEnd.y)).toBeGreaterThan(3);
  });

  test("source only: without exit, start snaps from center toward free endpoint", () => {
    const rect = node("r", 280, 200, 120, 50, "rect");
    const nodeById = new Map<string, DiagramNode>([["r", rect]]);
    const style = parseMxStyle("endArrow=classic;");
    const freeEnd = { x: 400, y: 225 };
    const staleStart = { x: 390, y: 220 };
    const out = snapEdgePointsToConnectionHints([staleStart, freeEnd], {
      source: "r",
      style,
      nodeById,
      geometryExplicitTerminals: false,
    });
    expect(out[1]).toEqual(freeEnd);
    expect(Math.hypot(out[0]!.x - staleStart.x, out[0]!.y - staleStart.y)).toBeGreaterThan(1);
  });

  test("skips orthogonalEdgeStyle", () => {
    const a = node("a", 0, 0, 50, 50, "rect");
    const b = node("b", 100, 0, 50, 50, "rect");
    const pts = [
      { x: 10, y: 10 },
      { x: 90, y: 40 },
    ];
    const style = parseMxStyle(
      "edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=0;entryX=0.5;entryY=1;",
    );
    const out = snapEdgePointsToConnectionHints(pts, {
      source: "a",
      target: "b",
      style,
      nodeById: new Map([
        ["a", a],
        ["b", b],
      ]),
    });
    expect(out[0]).toEqual(pts[0]);
    expect(out[1]).toEqual(pts[1]);
  });

  test("skips orthogonalEdgeStyle for target-only edges", () => {
    const cloud = node("c", 100, 50, 150, 95, "cloud");
    const pts = [
      { x: 30, y: 120 },
      { x: 180, y: 70 },
    ];
    const style = parseMxStyle("edgeStyle=orthogonalEdgeStyle;endArrow=classic;");
    const out = snapEdgePointsToConnectionHints(pts, {
      target: "c",
      style,
      nodeById: new Map([["c", cloud]]),
    });
    expect(out).toEqual(pts);
  });
});
