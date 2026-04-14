import { describe, expect, test } from "bun:test";
import { wrapVertexLabelToBoxWidth } from "./wrap-label.ts";

describe("wrapVertexLabelToBoxWidth (Pretext)", () => {
  test("wraps long Latin line to multiple lines", () => {
    const s = wrapVertexLabelToBoxWidth("aa bb cc dd ee ff gg", 72, 12, 8);
    const lines = s.split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(1);
  });

  test("hard-breaks or wraps very long unbroken token under narrow width", () => {
    const s = wrapVertexLabelToBoxWidth("abcdefghijklmnop", 40, 12, 8);
    expect(s).toContain("\n");
    expect(s.replace(/\n/g, "").length).toBe(16);
  });

  test("short label stays single line", () => {
    expect(wrapVertexLabelToBoxWidth("Hi", 200, 12, 8)).toBe("Hi");
  });

  test("preserves explicit newline with pre-wrap", () => {
    const s = wrapVertexLabelToBoxWidth("a\nb", 200, 12, 8);
    expect(s).toContain("\n");
    expect(s).toContain("a");
    expect(s).toContain("b");
  });
});
