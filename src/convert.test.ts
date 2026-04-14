import { describe, expect, test } from "bun:test";
import { convert } from "./convert.ts";

const minimalMxfile = `<?xml version="1.0"?>
<mxfile host="app.diagrams.net">
  <diagram id="p1" name="Page-1">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" pageWidth="850" pageHeight="1100">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Hello" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="100" y="80" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="3" value="Circle" style="ellipse;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">
          <mxGeometry x="300" y="80" width="80" height="80" as="geometry"/>
        </mxCell>
        <mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

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
    expect(convert(hex)).toContain('d="M 130 80 L 190 80 L 220 110 L 190 140 L 130 140 L 100 110 Z"');
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

  test("renders edge between source and target (center line)", () => {
    const svg = convert(minimalMxfile);
    expect(svg).toContain("<polyline");
    expect(svg).toContain('data-mx2svg-edge="4"');
    expect(svg).toContain("marker-end");
  });

  test("renders startArrow when startArrow is set in style", () => {
    const xml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "startArrow=classic;endArrow=classic;strokeColor=#82b366;",
    );
    const svg = convert(xml);
    expect(svg).toContain('marker-start="url(#mx2svg-arrow-start)"');
    expect(svg).toContain("marker-end");
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
    const xml = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;dashed=1;",
    );
    const svg = convert(xml);
    expect(svg).toContain('stroke-dasharray="6 4"');
  });

  test("vertex multiline value renders tspans with distinct y", () => {
    const xml = minimalMxfile.replace(
      'value="Hello"',
      'value="Line1&lt;br/&gt;Line2"',
    );
    const svg = convert(xml);
    expect(svg).toContain("<tspan");
    expect(svg).toContain("Line1");
    expect(svg).toContain("Line2");
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
    expect(svg).toContain("stop-color=\"#dae8fc\"");
    expect(svg).toContain("stop-color=\"#ffffff\"");
    expect(svg).toMatch(/fill="url\(#mx2svg-g-\d+\)"/);
  });
});
