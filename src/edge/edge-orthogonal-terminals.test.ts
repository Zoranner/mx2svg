import { describe, expect, test } from "bun:test";
import { parseMxStyle } from "../parse/style.ts";
import {
  inferOrthogonalTerminals,
  orthogonalEndpointsFromStyleOrInfer,
  parseEdgeConnectionHints,
} from "./edge-orthogonal-terminals.ts";
import type { DiagramNode } from "../core/model.ts";

function rectNode(x: number, y: number, w: number, h: number): DiagramNode {
  return {
    id: "n",
    parentId: null,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    label: "",
    shape: "rect",
    style: new Map(),
  };
}

describe("edge-orthogonal-terminals", () => {
  test("parseEdgeConnectionHints reads exit/entry ratios", () => {
    const st = parseMxStyle("edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=0;entryX=1;entryY=0.5;");
    expect(parseEdgeConnectionHints(st)).toEqual({
      exitX: 0.5,
      exitY: 0,
      entryX: 1,
      entryY: 0.5,
    });
  });

  test("inferOrthogonalTerminals vertical dominance: target above → top to bottom", () => {
    const a = rectNode(0, 100, 100, 100);
    const b = rectNode(0, 0, 100, 80);
    const { start, end } = inferOrthogonalTerminals(a, b);
    expect(start).toEqual({ x: 50, y: 100 });
    expect(end).toEqual({ x: 50, y: 80 });
  });

  test("orthogonalEndpointsFromStyleOrInfer prefers explicit exit over infer", () => {
    const source = rectNode(0, 200, 100, 100);
    const target = rectNode(0, 0, 100, 80);
    const style = parseMxStyle("exitX=0.5;exitY=0;");
    const { start, end } = orthogonalEndpointsFromStyleOrInfer(style, source, target);
    expect(start).toEqual({ x: 50, y: 200 });
    expect(end).toEqual({ x: 50, y: 80 });
  });
});
