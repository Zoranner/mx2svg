import { describe, expect, test } from "bun:test";
import {
  MX_FONT_BOLD,
  MX_FONT_ITALIC,
  MX_FONT_UNDERLINE,
  canvasFontString,
  mxFontStyleBits,
  svgFontAttrString,
  svgFontStack,
} from "./mx-font.ts";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function style(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
}

describe("mx-font", () => {
  test("mxFontStyleBits parses numeric fontStyle", () => {
    expect(mxFontStyleBits(new Map())).toBe(0);
    expect(mxFontStyleBits(style({ fontStyle: "1" }))).toBe(MX_FONT_BOLD);
    expect(mxFontStyleBits(style({ fontStyle: "2" }))).toBe(MX_FONT_ITALIC);
    expect(mxFontStyleBits(style({ fontStyle: "3" }))).toBe(MX_FONT_BOLD | MX_FONT_ITALIC);
    expect(mxFontStyleBits(style({ fontStyle: "4" }))).toBe(MX_FONT_UNDERLINE);
    expect(mxFontStyleBits(style({ fontStyle: "7" }))).toBe(MX_FONT_BOLD | MX_FONT_ITALIC | MX_FONT_UNDERLINE);
  });

  test("svgFontStack prepends fontFamily", () => {
    expect(svgFontStack(new Map())).toContain("Arial");
    expect(svgFontStack(style({ fontFamily: "Georgia" }))).toMatch(/^Georgia,/);
  });

  test("svgFontStack defaultTailStack replaces library default when no fontFamily", () => {
    expect(svgFontStack(new Map(), "Verdana, sans-serif")).toBe("Verdana, sans-serif");
    expect(svgFontStack(style({ fontFamily: "Georgia" }), "Verdana, sans-serif")).toMatch(/^Georgia,/);
  });

  test("svgFontAttrString emits bold italic underline", () => {
    const s = svgFontAttrString(style({ fontStyle: "7" }), esc);
    expect(s).toContain('font-weight="bold"');
    expect(s).toContain('font-style="italic"');
    expect(s).toContain('text-decoration="underline"');
  });

  test("canvasFontString order matches CSS font shorthand", () => {
    const c = canvasFontString(12, style({ fontStyle: "3", fontFamily: "Georgia" }));
    expect(c.startsWith("italic bold ")).toBe(true);
    expect(c).toContain("12px");
    expect(c).toContain("Georgia");
  });
});
