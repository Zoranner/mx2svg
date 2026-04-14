import { describe, expect, test } from "bun:test";
import {
  buildCurvedEdgePathD,
  curvedEdgeSegments,
  curvedEdgeToPolylineApprox,
} from "./edge-curve.ts";

describe("edge-curve", () => {
  test("two points: degenerate Q matches draw.io", () => {
    const d = buildCurvedEdgePathD([
      { x: 10, y: 20 },
      { x: 100, y: 80 },
    ]);
    expect(d).toBe("M 10 20 Q 10 20 100 80");
  });

  test("three points: single quadratic", () => {
    const d = buildCurvedEdgePathD([
      { x: 0, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 0 },
    ]);
    expect(d).toBe("M 0 0 Q 50 100 100 0");
  });

  test("four points: two quadratics through midpoints", () => {
    const d = buildCurvedEdgePathD([
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 0 },
    ]);
    expect(d).toBe("M 0 0 Q 0 50 50 50 Q 100 50 100 0");
  });

  test("curvedEdgeSegments joins at midpoints", () => {
    const segs = curvedEdgeSegments([
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 0 },
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[0].p2).toEqual({ x: 50, y: 50 });
    expect(segs[1].p0).toEqual({ x: 50, y: 50 });
  });

  test("polyline approx includes endpoints and is monotonic in count", () => {
    const poly = curvedEdgeToPolylineApprox(
      [
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
      ],
      4,
    );
    expect(poly.length).toBeGreaterThan(4);
    expect(poly[0]).toEqual({ x: 0, y: 0 });
    expect(poly[poly.length - 1]).toEqual({ x: 100, y: 0 });
  });
});
