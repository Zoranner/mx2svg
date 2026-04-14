import { describe, expect, test } from "bun:test";
import { bakeX, bakeY, pageBakeOriginFromBounds, shiftPathD } from "./page-bake.ts";

describe("page-bake", () => {
  test("pageBakeOriginFromBounds subtracts padding from min", () => {
    const o = pageBakeOriginFromBounds(100, 80, 8);
    expect(o.ox).toBe(92);
    expect(o.oy).toBe(72);
    expect(bakeX(o, 160)).toBe(68);
    expect(bakeY(o, 110)).toBe(38);
  });

  test("shiftPathD shifts absolute M L Q C A endpoints", () => {
    const d = "M 0 0 L 0 40 Q 0 50 10 50 L 100 50";
    expect(shiftPathD(d, -8, -8)).toBe("M 8 8 L 8 48 Q 8 58 18 58 L 108 58");
  });

  test("shiftPathD keeps arc radii and flags", () => {
    const d = "M 0 12.8 L 0 68 L 120 68 L 120 12.8 A 60 4.8 0 0 0 0 12.8 Z";
    const out = shiftPathD(d, 92, 72);
    expect(out).toContain(" A 60 4.8 0 0 0 ");
    expect(out).toMatch(/Z$/);
  });
});
