import { describe, expect, test } from "bun:test";
import {
  arrowMarkerId,
  buildArrowMarkerDefs,
  parseEndArrow,
  parseStartArrow,
} from "./edge-arrow.ts";
import type { DiagramEdge } from "./model.ts";

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

  test("arrowMarkerId encodes stroke hex slug", () => {
    expect(arrowMarkerId("filled", "end", "#82b366")).toBe("mx2svg-am-filled-end-82b366");
  });

  test("buildArrowMarkerDefs uses edge stroke in marker fill", () => {
    const e: DiagramEdge = {
      id: "e1",
      parentId: "1",
      source: "a",
      target: "b",
      label: "",
      points: [],
      style: new Map([
        ["endarrow", "classic"],
        ["strokecolor", "#ff0000"],
      ]),
    };
    const defs = buildArrowMarkerDefs([e]);
    expect(defs).toContain('id="mx2svg-am-filled-end-ff0000"');
    expect(defs).toContain('fill="#ff0000"');
  });
});
