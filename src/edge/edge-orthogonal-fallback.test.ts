import { describe, expect, test } from "bun:test";
import { parseMxStyle } from "../parse/style.ts";
import {
  orthogonalizeTwoPointPolyline,
  styleIsOrthogonalEdge,
} from "./edge-orthogonal-fallback.ts";

describe("edge-orthogonal-fallback", () => {
  test("styleIsOrthogonalEdge detects orthogonalEdgeStyle", () => {
    const a = parseMxStyle("edgeStyle=orthogonalEdgeStyle;endArrow=classic;");
    expect(styleIsOrthogonalEdge(a)).toBe(true);
    const b = parseMxStyle("endArrow=classic;");
    expect(styleIsOrthogonalEdge(b)).toBe(false);
  });

  test("orthogonalizeTwoPointPolyline adds Z-path (two elbows)", () => {
    const out = orthogonalizeTwoPointPolyline([
      { x: 0, y: 0 },
      { x: 10, y: 30 },
    ]);
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 15 },
      { x: 10, y: 15 },
      { x: 10, y: 30 },
    ]);
    const out2 = orthogonalizeTwoPointPolyline([
      { x: 0, y: 0 },
      { x: 40, y: 10 },
    ]);
    expect(out2).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 40, y: 10 },
    ]);
  });

  test("orthogonalizeTwoPointPolyline leaves axis-aligned segment", () => {
    const col = orthogonalizeTwoPointPolyline([
      { x: 5, y: 5 },
      { x: 5, y: 20 },
    ]);
    expect(col).toHaveLength(2);
  });
});
