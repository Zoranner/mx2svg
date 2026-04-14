import { describe, expect, test } from "bun:test";
import { convert } from "../convert.ts";
import { minimalMxfile } from "./test-fixtures.ts";

describe("convert", () => {
  test("renders rects and ellipse with labels", () => {
    const svg = convert(minimalMxfile);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Hello");
    expect(svg).toContain("Circle");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<ellipse");
  });

  test("shape rhombus renders closed path in bbox", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=rhombus;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    expect(svg).toMatch(/d="M 160 80 L 220 110 L 160 140 L 100 110 Z"/);
  });

  test("shape diamond is alias of rhombus", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=diamond;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toMatch(/d="M 160 80 L 220 110 L 160 140 L 100 110 Z"/);
  });

  test("shape hexagon and parallelogram render path", () => {
    const hex = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=hexagon;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    expect(convert(hex)).toContain(
      'd="M 130 80 L 190 80 L 220 110 L 190 140 L 130 140 L 100 110 Z"',
    );
    const para = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=parallelogram;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    expect(convert(para)).toContain('d="M 130 80 L 220 80 L 190 140 L 100 140 Z"');
  });

  test("shape cylinder3 renders path with elliptic arc", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=cylinder3;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    expect(svg).toMatch(/ A 60 [\d.]+\s+0 0 0 100 /);
  });

  test("shape triangle default north and trapezoid render path", () => {
    const tri = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=triangle;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    expect(convert(tri)).toContain('d="M 160 80 L 220 140 L 100 140 Z"');
    const trap = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=trapezoid;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    expect(convert(trap)).toContain('d="M 118 80 L 202 80 L 220 140 L 100 140 Z"');
  });

  test("shape cloud renders closed cubic path", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=cloud;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    expect(svg).toMatch(/M 130 95/);
    expect(svg).toContain(" C ");
    expect(svg).toMatch(/130 95 Z"/);
  });

  test("shape document renders wave bottom with Q curves", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=document;size=0.25;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    expect(svg).toContain(" Q ");
    expect(svg).toMatch(/M 100 80 L 220 80 L 220 132\.5/);
  });

  test("shape document places label center above full box center", () => {
    const svg = convert(
      minimalMxfile.replace(
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "shape=document;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      ),
    );
    expect(svg).toContain("Hello");
    expect(svg).toContain('y="101"');
    expect(svg).not.toContain('y="110"');
  });

  test("shape dataStorage renders path with two Q curves", () => {
    const svg = convert(
      minimalMxfile.replace(
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "shape=dataStorage;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      ),
    );
    expect(svg).toContain("<path ");
    const ds = [...svg.matchAll(/d="([^"]+)"/g)].map((x) => x[1]);
    const blob = ds.find((d) => d.includes(" Q ") && d.startsWith("M 112 80"));
    expect(blob).toBeDefined();
  });

  test("shape internalStorage draws rect and two divider lines", () => {
    const svg = convert(
      minimalMxfile.replace(
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "shape=internalStorage;dx=20;dy=25;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      ),
    );
    expect(svg).toContain("<rect ");
    expect((svg.match(/<line /g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(svg).toContain('y1="105"');
    expect(svg).toContain('x1="120"');
  });

  test("shape pentagon renders five-sided path", () => {
    const svg = convert(
      minimalMxfile.replace(
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "shape=pentagon;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      ),
    );
    expect(svg).toContain("<path ");
    const ds = [...svg.matchAll(/d="([^"]+)"/g)].map((x) => x[1]);
    const pent = ds.find((d) => (d.match(/ L /g) ?? []).length === 4 && d.endsWith(" Z"));
    expect(pent).toBeDefined();
  });

  test("shape triangle direction south flips apex", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=triangle;direction=south;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    expect(convert(xml)).toContain('d="M 100 80 L 220 80 L 160 140 Z"');
  });

  test("renders edge between source and target (center line)", () => {
    const svg = convert(minimalMxfile);
    expect(svg).toContain("<polyline");
    expect(svg).toContain('data-mx2svg-edge="4"');
    expect(svg).toContain("marker-end");
    expect(svg).toMatch(/160,110/);
    expect(svg).toMatch(/340,120/);
  });

  test("edge spacing on center fallback shifts polyline away from node centers", () => {
    const xml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "endArrow=classic;strokeColor=#82b366;spacing=12;",
    );
    const svg = convert(xml);
    const inner = svg.match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const m = inner.match(/points="([^"]+)"/);
    expect(m).not.toBeNull();
    const pts = m![1].split(/\s+/).filter(Boolean);
    const [fx, fy] = pts[0].split(",").map(Number);
    expect(fx).toBeGreaterThan(200);
    expect(fy).toBeGreaterThan(108);
    expect(inner).not.toContain("160,110");
  });

  test("edge spacing from rotated ellipse source differs from axis-aligned ellipse polyline start", () => {
    const base = minimalMxfile
      .replace(
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "ellipse;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      )
      .replace(
        "endArrow=classic;strokeColor=#82b366;",
        "endArrow=classic;strokeColor=#82b366;spacing=12;",
      );
    const flatGeo = '<mxGeometry x="100" y="80" width="120" height="60" as="geometry"/>';
    const rotGeo =
      '<mxGeometry x="100" y="80" width="120" height="60" rotation="45" as="geometry"/>';
    const firstPolylinePoint = (svg: string): string =>
      svg
        .match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1]
        ?.match(/points="([^"]+)"/)?.[1]
        ?.split(/\s+/)?.[0] ?? "";
    expect(firstPolylinePoint(convert(base.replace(flatGeo, rotGeo)))).not.toBe(
      firstPolylinePoint(convert(base)),
    );
  });

  test("edge spacing from rhombus source differs from rect source polyline start", () => {
    const rhombusXml = minimalMxfile
      .replace(
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "shape=rhombus;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      )
      .replace(
        "endArrow=classic;strokeColor=#82b366;",
        "endArrow=classic;strokeColor=#82b366;spacing=12;",
      );
    const rectXml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "endArrow=classic;strokeColor=#82b366;spacing=12;",
    );
    const firstPolylinePoint = (svg: string): string =>
      svg
        .match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1]
        ?.match(/points="([^"]+)"/)?.[1]
        ?.split(/\s+/)?.[0] ?? "";
    expect(firstPolylinePoint(convert(rhombusXml))).not.toBe(firstPolylinePoint(convert(rectXml)));
  });

  test("renders startArrow when startArrow is set in style", () => {
    const xml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "startArrow=classic;endArrow=classic;strokeColor=#82b366;",
    );
    const svg = convert(xml);
    expect(svg).toContain('marker-start="url(#mx2svg-am-filled-start-82b366)"');
    expect(svg).toContain("marker-end");
  });

  test("endArrow=open uses stroked chevron marker", () => {
    const xml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "endArrow=open;strokeColor=#82b366;",
    );
    expect(convert(xml)).toContain('marker-end="url(#mx2svg-am-open-end-82b366)"');
  });

  test("endArrow=none omits marker-end on edge geometry", () => {
    const xml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "endArrow=none;strokeColor=#82b366;",
    );
    const svg = convert(xml);
    const inner = svg.match(/data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(inner).not.toContain("marker-end");
  });

  test("startArrow=open with endArrow=open uses both open markers", () => {
    const xml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "startArrow=open;endArrow=open;strokeColor=#82b366;",
    );
    const svg = convert(xml);
    expect(svg).toContain('marker-start="url(#mx2svg-am-open-start-82b366)"');
    expect(svg).toContain('marker-end="url(#mx2svg-am-open-end-82b366)"');
  });

  test("edge label whiteSpace=wrap uses geometry width and yields multiple tspans", () => {
    const xml = minimalMxfile
      .replace(
        '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
        '<mxCell id="4" value="aa bb cc dd ee ff gg hh ii" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;whiteSpace=wrap;fontSize=11;">',
      )
      .replace(
        '<mxGeometry relative="1" as="geometry"/>',
        '<mxGeometry relative="1" width="52" height="40" as="geometry"/>',
      );
    const svg = convert(xml);
    const inner = svg.match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect((inner.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
  });

  test("edge label whiteSpace=wrap with align=left uses text-anchor start on multiline", () => {
    const xml = minimalMxfile
      .replace(
        '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
        '<mxCell id="4" value="aa bb cc dd ee ff gg hh ii" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;whiteSpace=wrap;fontSize=11;align=left;">',
      )
      .replace(
        '<mxGeometry relative="1" as="geometry"/>',
        '<mxGeometry relative="1" width="52" height="40" as="geometry"/>',
      );
    const inner = convert(xml).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect((inner.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
    expect(inner).toMatch(/text-anchor="start"/);
  });

  test("renders edge label at midpoint of polyline with contrast stroke", () => {
    const xml = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="relates" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;">',
    );
    const svg = convert(xml);
    expect(svg).toContain("relates");
    expect(svg).toContain('x="250"');
    expect(svg).toContain('y="115"');
    expect(svg).toContain('paint-order="stroke fill"');
  });

  test("edge label align=left and align=right set text-anchor start and end", () => {
    const base = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="relates" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;">',
    );
    const left = base.replace("fontSize=11;", "fontSize=11;align=left;");
    const right = base.replace("fontSize=11;", "fontSize=11;align=right;");
    const innerC = convert(base).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const innerL = convert(left).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const innerR = convert(right).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(innerC).toMatch(/text-anchor="middle"/);
    expect(innerL).toMatch(/text-anchor="start"/);
    expect(innerR).toMatch(/text-anchor="end"/);
  });

  test("edge label verticalAlign=top moves text down; verticalAlign=bottom moves up", () => {
    const base = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="relates" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;">',
    );
    const top = base.replace("fontSize=11;", "fontSize=11;verticalAlign=top;");
    const bottom = base.replace("fontSize=11;", "fontSize=11;verticalAlign=bottom;");
    const innerC = convert(base).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const innerT = convert(top).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const innerB = convert(bottom).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const yC = Number(innerC.match(/<text[^>]*\sy="([\d.]+)"/)?.[1] ?? NaN);
    const yT = Number(innerT.match(/<text[^>]*\sy="([\d.]+)"/)?.[1] ?? NaN);
    const yB = Number(innerB.match(/<text[^>]*\sy="([\d.]+)"/)?.[1] ?? NaN);
    expect(yT).toBeGreaterThan(yC);
    expect(yB).toBeLessThan(yC);
  });

  test("edge label align=left with labelBackgroundColor shifts rect to the right of centered case", () => {
    const centered = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="edge cap" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;labelBackgroundColor=#e1d5e7;">',
    );
    const left = centered.replace("fontSize=11;", "fontSize=11;align=left;");
    const innerC =
      convert(centered).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const innerL = convert(left).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const rxC = Number(innerC.match(/<rect[^>]*\sx="([\d.]+)"/)?.[1] ?? NaN);
    const rxL = Number(innerL.match(/<rect[^>]*\sx="([\d.]+)"/)?.[1] ?? NaN);
    expect(rxL).toBeGreaterThan(rxC);
  });

  test("edge labelPadding offsets label perpendicular to path", () => {
    const xml = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="relates" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;labelPadding=18;">',
    );
    const svg = convert(xml);
    expect(svg).toContain("relates");
    const inner = svg.match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const yAttr = inner.match(/<text[^>]*\sy="([\d.]+)"/)?.[1];
    expect(yAttr).toBeDefined();
    expect(Number(yAttr)).not.toBeCloseTo(115, 0);
  });

  test("edge labelBackgroundColor draws rounded rect under label and skips contrast halo", () => {
    const xml = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="edge cap" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;labelBackgroundColor=#e1d5e7;">',
    );
    const svg = convert(xml);
    const inner = svg.match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(inner).toContain("edge cap");
    expect(inner).toMatch(/<rect[^>]*rx="4"[^>]*ry="4"[^>]*fill="#e1d5e7"/);
    expect(inner).not.toContain("paint-order");
  });

  test("edge label uses mxGeometry x y offset from midpoint when relative=1", () => {
    const xml = minimalMxfile
      .replace(
        '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
        '<mxCell id="4" value="off" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;">',
      )
      .replace(
        '<mxGeometry relative="1" as="geometry"/>',
        '<mxGeometry relative="1" as="geometry" x="30" y="-5"/>',
      );
    const svg = convert(xml);
    expect(svg).toContain("off");
    expect(svg).toContain('x="280"');
    expect(svg).toContain('y="110"');
  });

  test("edge label mxPoint as label uses fraction along path", () => {
    const xml = minimalMxfile
      .replace(
        '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
        '<mxCell id="4" value="frac" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;">',
      )
      .replace(
        '<mxGeometry relative="1" as="geometry"/>',
        '<mxGeometry relative="1" as="geometry"><mxPoint x="0.25" y="0" as="label"/></mxGeometry>',
      );
    const svg = convert(xml);
    expect(svg).toContain("frac");
    expect(svg).toContain('x="205"');
    expect(svg).toContain('y="112.5"');
  });

  test("renders edge from explicit mxPoint path", () => {
    const xml = `<?xml version="1.0"?>
<mxfile><diagram id="p1" name="P"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="e1" edge="1" parent="1" style="strokeColor=#000;">
    <mxGeometry relative="1" as="geometry">
      <mxPoint x="10" y="20" as="sourcePoint"/>
      <mxPoint x="100" y="80" as="targetPoint"/>
    </mxGeometry>
  </mxCell>
</root></mxGraphModel></diagram></mxfile>`;
    const svg = convert(xml);
    expect(svg).toContain("<polyline");
    expect(svg).toContain("10,20");
    expect(svg).toContain("100,80");
  });

  test("rounded=1 on polyline edge renders orthogonal corner path", () => {
    const xml = `<?xml version="1.0"?>
<mxfile><diagram id="p1" name="P"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="e1" edge="1" parent="1" style="rounded=1;strokeColor=#000;">
    <mxGeometry relative="1" as="geometry">
      <mxPoint x="0" y="0" as="sourcePoint"/>
      <Array as="points"><mxPoint x="0" y="50"/></Array>
      <mxPoint x="100" y="50" as="targetPoint"/>
    </mxGeometry>
  </mxCell>
</root></mxGraphModel></diagram></mxfile>`;
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    expect(svg).toContain('d="M 0 0 L 0 40 Q 0 50 10 50 L 100 50"');
  });

  test("jumpStyle=arc inserts cubic arc at edge crossing", () => {
    const xml = `<?xml version="1.0"?>
<mxfile><diagram id="p1" name="P"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="h" edge="1" parent="1" style="jumpStyle=arc;jumpSize=6;strokeColor=#000;">
    <mxGeometry relative="1" as="geometry">
      <mxPoint x="0" y="50" as="sourcePoint"/>
      <mxPoint x="100" y="50" as="targetPoint"/>
    </mxGeometry>
  </mxCell>
  <mxCell id="v" edge="1" parent="1" style="strokeColor=#000;">
    <mxGeometry relative="1" as="geometry">
      <mxPoint x="50" y="0" as="sourcePoint"/>
      <mxPoint x="50" y="100" as="targetPoint"/>
    </mxGeometry>
  </mxCell>
</root></mxGraphModel></diagram></mxfile>`;
    const svg = convert(xml);
    const hGroup = svg.match(/data-mx2svg-edge="h"[^>]*>[\s\S]*?<\/g>/);
    expect(hGroup).not.toBeNull();
    expect(hGroup![0]).toContain(" C ");
  });

  test("curved=1 renders path with Q commands", () => {
    const xml = `<?xml version="1.0"?>
<mxfile><diagram id="p1" name="P"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="e1" edge="1" parent="1" style="curved=1;strokeColor=#000;">
    <mxGeometry relative="1" as="geometry">
      <mxPoint x="0" y="0" as="sourcePoint"/>
      <Array as="points">
        <mxPoint x="0" y="50"/><mxPoint x="100" y="50"/>
      </Array>
      <mxPoint x="100" y="0" as="targetPoint"/>
    </mxGeometry>
  </mxCell>
</root></mxGraphModel></diagram></mxfile>`;
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    expect(svg).toContain('d="M 0 0 Q 0 50 50 50 Q 100 50 100 0"');
    expect(svg).not.toContain("<polyline");
  });

  test("rect with rounded=0 has no corner radius", () => {
    const svg = convert(minimalMxfile);
    expect(svg).toContain('rx="0"');
    expect(svg).toContain('ry="0"');
  });

  test("rect with rounded=1 uses proportional rx/ry", () => {
    const xml = minimalMxfile.replace("rounded=0;", "rounded=1;");
    const svg = convert(xml);
    expect(svg).toMatch(/rx="12"/);
    expect(svg).toMatch(/ry="12"/);
  });

  test("rect with rounded=N uses pixel radius (capped)", () => {
    const xml = minimalMxfile.replace("rounded=0;", "rounded=8;");
    const svg = convert(xml);
    expect(svg).toMatch(/rx="8"/);
  });

  test("vertex dashed stroke uses stroke-dasharray", () => {
    const xml = minimalMxfile.replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;dashed=1;");
    const svg = convert(xml);
    expect(svg).toContain('stroke-dasharray="6 4"');
  });

  test("vertex multiline value renders tspans with distinct y", () => {
    const xml = minimalMxfile.replace('value="Hello"', 'value="Line1&lt;br/&gt;Line2"');
    const svg = convert(xml);
    expect(svg).toContain("<tspan");
    expect(svg).toContain("Line1");
    expect(svg).toContain("Line2");
  });

  test("vertex labelBackgroundColor draws rounded rect under label", () => {
    const xml = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;labelBackgroundColor=#e1d5e7;",
    );
    const svg = convert(xml);
    expect(svg).toContain('fill="#e1d5e7"');
    expect(svg).toMatch(/<rect[^>]*rx="4"[^>]*ry="4"[^>]*fill="#e1d5e7"/);
  });

  test("vertex label align=left sets text-anchor start", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;align=left;",
    );
    const inner = convert(xml).match(/<g data-mx2svg-id="2"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(inner).toContain("Hello");
    expect(inner).toMatch(/text-anchor="start"/);
  });

  test("vertex label verticalAlign=top moves text up (smaller y) vs middle", () => {
    const base = minimalMxfile;
    const top = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;verticalAlign=top;",
    );
    const innerC = convert(base).match(/<g data-mx2svg-id="2"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const innerT = convert(top).match(/<g data-mx2svg-id="2"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const yC = Number(innerC.match(/<text[^>]*\sy="([\d.]+)"/)?.[1] ?? NaN);
    const yT = Number(innerT.match(/<text[^>]*\sy="([\d.]+)"/)?.[1] ?? NaN);
    expect(yT).toBeLessThan(yC);
  });

  test("vertex align=left with labelBackgroundColor shifts label rect left of centered case", () => {
    const centered = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;labelBackgroundColor=#e1d5e7;",
    );
    const left = centered.replace(
      "labelBackgroundColor=#e1d5e7;",
      "align=left;labelBackgroundColor=#e1d5e7;",
    );
    const innerC = convert(centered).match(/<g data-mx2svg-id="2"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const innerL = convert(left).match(/<g data-mx2svg-id="2"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    const labelRectX = (inner: string) =>
      Number(
        inner.match(/<rect[^>]*fill="#e1d5e7"[^>]*\sx="([\d.]+)"/)?.[1] ??
          inner.match(/<rect[^>]*\sx="([\d.]+)"[^>]*fill="#e1d5e7"/)?.[1] ??
          NaN,
      );
    expect(labelRectX(innerL)).toBeLessThan(labelRectX(innerC));
  });

  test("vertex mxGeometry rotation wraps group in svg rotate around center", () => {
    const xml = minimalMxfile.replace(
      '<mxGeometry x="100" y="80" width="120" height="60" as="geometry"/>',
      '<mxGeometry x="100" y="80" width="120" height="60" rotation="45" as="geometry"/>',
    );
    const svg = convert(xml);
    expect(svg).toContain('transform="rotate(45, 160, 110)"');
  });

  test("vertex fontColor sets text fill", () => {
    const xml = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;fontColor=#cc0000;",
    );
    const svg = convert(xml);
    expect(svg).toContain('fill="#cc0000"');
    expect(svg).toContain("Hello");
  });

  test("vertex opacity=50 sets group opacity 0.5", () => {
    const xml = minimalMxfile.replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;opacity=50;");
    expect(convert(xml)).toMatch(/data-mx2svg-id="2"[^>]*opacity="0\.5"/);
  });

  test("vertex opacity with decimal uses 0-1 scale", () => {
    const xml = minimalMxfile.replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;opacity=0.25;");
    expect(convert(xml)).toMatch(/data-mx2svg-id="2"[^>]*opacity="0\.25"/);
  });

  test("vertex opacity=100 omits opacity on group", () => {
    const xml = minimalMxfile.replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;opacity=100;");
    expect(convert(xml)).not.toMatch(/data-mx2svg-id="2"[^>]*opacity=/);
  });

  test("edge opacity applies to edge group", () => {
    const xml = minimalMxfile.replace(
      'style="endArrow=classic;strokeColor=#82b366;"',
      'style="endArrow=classic;strokeColor=#82b366;opacity=40;"',
    );
    expect(convert(xml)).toMatch(/data-mx2svg-edge="4"[^>]*opacity="0\.4"/);
  });

  test("vertex fillOpacity emits fill-opacity on shape", () => {
    const xml = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;fillOpacity=40;",
    );
    const inner = convert(xml).match(/<g data-mx2svg-id="2"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(inner).toMatch(/fill-opacity="0\.4"/);
    expect(inner).not.toMatch(/stroke-opacity=/);
  });

  test("vertex strokeOpacity emits stroke-opacity on shape", () => {
    const xml = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;strokeOpacity=50;",
    );
    const inner = convert(xml).match(/<g data-mx2svg-id="2"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(inner).toMatch(/stroke-opacity="0\.5"/);
  });

  test("edge strokeOpacity applies to line geometry", () => {
    const xml = minimalMxfile.replace(
      'style="endArrow=classic;strokeColor=#82b366;"',
      'style="endArrow=classic;strokeColor=#82b366;strokeOpacity=35;"',
    );
    const inner = convert(xml).match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(inner).toMatch(/stroke-opacity="0\.35"/);
  });

  test("vertex fontStyle=1 sets font-weight bold on label", () => {
    const xml = minimalMxfile.replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;fontStyle=1;");
    const svg = convert(xml);
    expect(svg).toContain('font-weight="bold"');
    expect(svg).not.toContain('font-style="italic"');
  });

  test("vertex fontStyle=2 sets font-style italic", () => {
    const xml = minimalMxfile.replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;fontStyle=2;");
    const svg = convert(xml);
    expect(svg).toContain('font-style="italic"');
    expect(svg).not.toContain('font-weight="bold"');
  });

  test("vertex fontStyle=3 sets bold and italic", () => {
    const xml = minimalMxfile.replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;fontStyle=3;");
    const svg = convert(xml);
    expect(svg).toContain('font-weight="bold"');
    expect(svg).toContain('font-style="italic"');
  });

  test("vertex fontFamily appears in SVG font-family stack", () => {
    const xml = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;fontFamily=Georgia;",
    );
    const svg = convert(xml);
    expect(svg).toContain("Georgia");
    expect(svg).toContain("Arial");
  });

  test("ConvertOptions defaultFontStack applies when cell has no fontFamily", () => {
    const svg = convert(minimalMxfile, { defaultFontStack: "Courier New, monospace" });
    expect(svg).toContain("Courier New");
    expect(svg).toContain("Hello");
    expect(svg).not.toMatch(/Arial, Helvetica/);
  });

  test("whiteSpace=wrap wraps long label with Pretext into multiple tspans", () => {
    const xml = minimalMxfile.replace(
      'value="Hello"',
      'value="One two three four five six seven eight nine ten"',
    );
    const svg = convert(xml);
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
  });

  test("vertex value with HTML shows plain text in SVG", () => {
    const xml = minimalMxfile.replace(
      'value="Hello"',
      'value="&lt;p style=&quot;margin:0&quot;&gt;Hi&lt;/p&gt;"',
    );
    const svg = convert(xml);
    expect(svg).toContain("Hi");
    expect(svg).not.toMatch(/<p(\s|>)/);
  });

  test("fill gradient emits linearGradient and url fill", () => {
    const xml = minimalMxfile.replace(
      "fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "fillColor=#dae8fc;gradientColor=#ffffff;gradientDirection=east;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain('x1="0%"');
    expect(svg).toContain('x2="100%"');
    expect(svg).toContain('stop-color="#dae8fc"');
    expect(svg).toContain('stop-color="#ffffff"');
    expect(svg).toMatch(/fill="url\(#mx2svg-g-\d+\)"/);
  });
});
