import { describe, expect, test } from "bun:test";
import type { DiagramEdge } from "../core/model.ts";
import {
  arrowMarkerId,
  buildArrowMarkerDefs,
  parseEndArrow,
  parseStartArrow,
} from "./edge-arrow.ts";

describe("edge-arrow", () => {
  test("parseEndArrow defaults to filled", () => {
    expect(parseEndArrow(new Map())).toBe("filled");
    expect(parseEndArrow(new Map([["endarrow", "classic"]]))).toBe("filled");
    expect(parseEndArrow(new Map([["endarrow", "block"]]))).toBe("filled");
  });

  test("parseEndArrow open oval diamond dash none", () => {
    const s = new Map<string, string>();
    s.set("endarrow", "open");
    expect(parseEndArrow(s)).toBe("open");
    s.set("endarrow", "oval");
    expect(parseEndArrow(s)).toBe("oval");
    s.set("endarrow", "diamond");
    expect(parseEndArrow(s)).toBe("diamond");
    s.set("endarrow", "baseDash");
    expect(parseEndArrow(s)).toBe("dash");
    s.set("endarrow", "doubleBlock");
    expect(parseEndArrow(s)).toBe("doubleBlock");
    s.set("endarrow", "classicThin");
    expect(parseEndArrow(s)).toBe("filled");
    s.set("endarrow", "none");
    expect(parseEndArrow(s)).toBe("none");
  });

  test("parseStartArrow unset is none", () => {
    expect(parseStartArrow(new Map())).toBe("none");
  });

  test("parseStartArrow mirrors end tokens", () => {
    const s = new Map<string, string>([["startarrow", "open"]]);
    expect(parseStartArrow(s)).toBe("open");
    s.set("startarrow", "doubleBlock");
    expect(parseStartArrow(s)).toBe("doubleBlock");
  });

  test("arrowMarkerId encodes stroke hex slug", () => {
    expect(arrowMarkerId("filled", "end", "#82b366")).toBe("mx2svg-am-filled-end-82b366");
    expect(arrowMarkerId("filled", "end", "#82b366", 2)).toBe("mx2svg-am-filled-end-82b366-2000");
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

  test("buildArrowMarkerDefs shrinks marker for thin endArrow at same endSize", () => {
    const thin: DiagramEdge = {
      id: "e2",
      parentId: "1",
      source: "a",
      target: "b",
      label: "",
      points: [],
      style: new Map([
        ["endarrow", "classicThin"],
        ["strokecolor", "#00aa00"],
        ["endsize", "12"],
      ]),
    };
    const defs = buildArrowMarkerDefs([thin]);
    expect(defs).toContain('id="mx2svg-am-filled-end-00aa00-1440"');
    /** 同 endSize 下 thin 箭头缩放约为 0.72×，marker 宽度四舍五入到小数点后两位 */
    expect(defs).toContain('markerWidth="14.4"');
  });

  test("buildArrowMarkerDefs doubleBlock uses two filled triangles", () => {
    const e: DiagramEdge = {
      id: "e3",
      parentId: "1",
      source: "a",
      target: "b",
      label: "",
      points: [],
      style: new Map([
        ["endarrow", "doubleBlock"],
        ["strokecolor", "#112233"],
      ]),
    };
    const defs = buildArrowMarkerDefs([e]);
    expect(defs).toContain('id="mx2svg-am-doubleBlock-end-112233"');
    expect((defs.match(/<path/g) ?? []).length).toBe(2);
  });

  test("buildArrowMarkerDefs scales marker when endSize is set", () => {
    const e: DiagramEdge = {
      id: "e1",
      parentId: "1",
      source: "a",
      target: "b",
      label: "",
      points: [],
      style: new Map([
        ["endarrow", "classic"],
        ["strokecolor", "#00aa00"],
        ["endsize", "12"],
      ]),
    };
    const defs = buildArrowMarkerDefs([e]);
    expect(defs).toContain('id="mx2svg-am-filled-end-00aa00-2000"');
    expect(defs).toContain('markerWidth="20"');
  });
});
