import { describe, expect, test } from "bun:test";
import { parseEndArrow, parseStartArrow } from "./edge-arrow.ts";

describe("edge-arrow", () => {
  test("parseEndArrow defaults to filled", () => {
    expect(parseEndArrow(new Map())).toBe("filled");
    expect(parseEndArrow(new Map([["endarrow", "classic"]]))).toBe("filled");
    expect(parseEndArrow(new Map([["endarrow", "block"]]))).toBe("filled");
  });

  test("parseEndArrow open oval diamond none", () => {
    const s = new Map<string, string>();
    s.set("endarrow", "open");
    expect(parseEndArrow(s)).toBe("open");
    s.set("endarrow", "oval");
    expect(parseEndArrow(s)).toBe("oval");
    s.set("endarrow", "diamond");
    expect(parseEndArrow(s)).toBe("diamond");
    s.set("endarrow", "none");
    expect(parseEndArrow(s)).toBe("none");
  });

  test("parseStartArrow unset is none", () => {
    expect(parseStartArrow(new Map())).toBe("none");
  });

  test("parseStartArrow mirrors end tokens", () => {
    const s = new Map<string, string>([["startarrow", "open"]]);
    expect(parseStartArrow(s)).toBe("open");
  });
});
