import { describe, expect, test } from "bun:test";
import { mxEdgeLabelRelativeXToArcFraction, parseEdgeLabelChildGeometry } from "./mx-geometry.ts";

describe("mxEdgeLabelRelativeXToArcFraction", () => {
  test("maps mxGraph relative x in [-1,1] to arc fraction from source", () => {
    expect(mxEdgeLabelRelativeXToArcFraction(-1)).toBe(0);
    expect(mxEdgeLabelRelativeXToArcFraction(0)).toBe(0.5);
    expect(mxEdgeLabelRelativeXToArcFraction(1)).toBe(1);
    expect(mxEdgeLabelRelativeXToArcFraction(0.095)).toBeCloseTo(0.5475, 10);
    expect(mxEdgeLabelRelativeXToArcFraction(-0.0345)).toBeCloseTo(0.48275, 10);
  });

  test("returns null outside mxGraph edge-label x range", () => {
    expect(mxEdgeLabelRelativeXToArcFraction(-1.01)).toBeNull();
    expect(mxEdgeLabelRelativeXToArcFraction(1.01)).toBeNull();
  });
});

describe("parseEdgeLabelChildGeometry", () => {
  test("JLVC-style edgeLabel: x=0.095 y=1 offset (1,1) → fraction (0.095+1)/2 plus offsets", () => {
    const geo = {
      "@_relative": "1",
      "@_x": "0.095",
      "@_y": "1",
      mxPoint: {
        "@_as": "offset",
        "@_x": "1",
        "@_y": "1",
      },
    } as Record<string, unknown>;
    expect(parseEdgeLabelChildGeometry(geo)).toEqual({
      edgeLabelPath: { fraction: 0.5475, normalOffset: 1 },
      edgeLabelMidOffset: { dx: 1, dy: 1 },
    });
  });
});
