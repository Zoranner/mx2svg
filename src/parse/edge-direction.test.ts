import { describe, expect, test } from "bun:test";
import type { DiagramEdge, DiagramNode } from "../core/model.ts";
import { applyEdgePointDirectionFromTerminals } from "./edge-direction.ts";

function node(id: string, x: number, y: number, w: number, h: number): DiagramNode {
  return {
    id,
    parentId: "1",
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    label: id,
    shape: "rect",
    style: new Map(),
  };
}

describe("applyEdgePointDirectionFromTerminals", () => {
  test("reverses polyline when first point is nearer target than source", () => {
    const a = node("a", 0, 0, 100, 100);
    const b = node("b", 200, 0, 100, 100);
    const map = new Map<string, DiagramNode>([
      [a.id, a],
      [b.id, b],
    ]);
    const e: DiagramEdge = {
      id: "e1",
      parentId: "1",
      source: "a",
      target: "b",
      label: "",
      points: [
        { x: 250, y: 50 },
        { x: 50, y: 50 },
      ],
      style: new Map([
        ["endarrow", "classic"],
        ["startarrow", "none"],
      ]),
    };
    applyEdgePointDirectionFromTerminals(e, map);
    expect(e.points).toEqual([
      { x: 50, y: 50 },
      { x: 250, y: 50 },
    ]);
    expect(e.style.get("startarrow")).toBe("classic");
    expect(e.style.get("endarrow")).toBe("none");
  });

  test("leaves order when first point is nearer source", () => {
    const a = node("a", 0, 0, 100, 100);
    const b = node("b", 200, 0, 100, 100);
    const map = new Map<string, DiagramNode>([
      [a.id, a],
      [b.id, b],
    ]);
    const pts = [
      { x: 50, y: 50 },
      { x: 250, y: 50 },
    ];
    const e: DiagramEdge = {
      id: "e1",
      parentId: "1",
      source: "a",
      target: "b",
      label: "",
      points: [...pts],
      style: new Map([
        ["endarrow", "classic"],
        ["startarrow", "none"],
      ]),
    };
    applyEdgePointDirectionFromTerminals(e, map);
    expect(e.points).toEqual(pts);
    expect(e.style.get("endarrow")).toBe("classic");
    expect(e.style.get("startarrow")).toBe("none");
  });

  test("flips edgeLabelPath fraction and normal when reversed", () => {
    const a = node("a", 0, 0, 100, 100);
    const b = node("b", 200, 0, 100, 100);
    const map = new Map<string, DiagramNode>([
      [a.id, a],
      [b.id, b],
    ]);
    const e: DiagramEdge = {
      id: "e1",
      parentId: "1",
      source: "a",
      target: "b",
      label: "",
      points: [
        { x: 250, y: 50 },
        { x: 50, y: 50 },
      ],
      style: new Map(),
      edgeLabelPath: { fraction: 0.25, normalOffset: 8 },
    };
    applyEdgePointDirectionFromTerminals(e, map);
    expect(e.edgeLabelPath).toEqual({ fraction: 0.75, normalOffset: -8 });
  });

  test("swaps endsize and startsize when reversed", () => {
    const a = node("a", 0, 0, 100, 100);
    const b = node("b", 200, 0, 100, 100);
    const map = new Map<string, DiagramNode>([
      [a.id, a],
      [b.id, b],
    ]);
    const e: DiagramEdge = {
      id: "e1",
      parentId: "1",
      source: "a",
      target: "b",
      label: "",
      points: [
        { x: 250, y: 50 },
        { x: 50, y: 50 },
      ],
      style: new Map([
        ["endsize", "10"],
        ["startsize", "6"],
      ]),
    };
    applyEdgePointDirectionFromTerminals(e, map);
    expect(e.style.get("endsize")).toBe("6");
    expect(e.style.get("startsize")).toBe("10");
  });
});
