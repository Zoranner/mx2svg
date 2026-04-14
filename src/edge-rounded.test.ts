import { describe, expect, test } from "bun:test";
import { buildRoundedOrthogonalPathD, roundedOrthogonalToPolylineApprox } from "./edge-rounded.ts";

describe("edge-rounded", () => {
  test("orthogonal elbow with rounded=1 uses L and Q", () => {
    const d = buildRoundedOrthogonalPathD([
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ]);
    expect(d).toBe("M 0 0 L 0 40 Q 0 50 10 50 L 100 50");
  });

  test("arcSize override is halved like draw.io (larger style arcSize = larger corner)", () => {
    const d = buildRoundedOrthogonalPathD(
      [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
      40,
    );
    expect(d).toBe("M 0 0 L 0 30 Q 0 50 20 50 L 100 50");
  });

  test("polyline approx ends at target", () => {
    const poly = roundedOrthogonalToPolylineApprox(
      [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
      undefined,
      4,
    );
    const last = poly[poly.length - 1];
    expect(last.x).toBe(100);
    expect(last.y).toBe(50);
  });
});
