/**
 * 将多种典型图转成 SVG落到 `.test-output/convert/`，与同目录 `convert.test.ts` 的断言互补，便于浏览器目视。
 */
import { describe, expect, test } from "bun:test";
import { convert } from "../convert.ts";
import { minimalMxfile } from "./test-fixtures.ts";
import { writeTestOutputSvg } from "./test-svg-dump.ts";

function dump(name: string, svg: string): void {
  writeTestOutputSvg("convert", name, svg);
}

const xmlCurvedEdge = `<?xml version="1.0"?>
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

const xmlRoundedOrthogonal = `<?xml version="1.0"?>
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

const xmlJumpArc = `<?xml version="1.0"?>
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

describe("convert → .test-output/convert", () => {
  test("minimal baseline (rect + ellipse + edge)", () => {
    const svg = convert(minimalMxfile);
    expect(svg).toContain("Hello");
    dump("01-minimal-baseline", svg);
  });

  test("shape rhombus", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=rhombus;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    dump("02-shape-rhombus", svg);
  });

  test("shape cloud", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=cloud;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain(" C ");
    dump("03-shape-cloud", svg);
  });

  test("shape document", () => {
    const xml = minimalMxfile.replace(
      "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "shape=document;size=0.25;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    dump("04-shape-document", svg);
  });

  test("edge curved quadratic", () => {
    const svg = convert(xmlCurvedEdge);
    expect(svg).toContain(" Q ");
    dump("05-edge-curved", svg);
  });

  test("edge rounded orthogonal", () => {
    const svg = convert(xmlRoundedOrthogonal);
    expect(svg).toContain(" Q ");
    dump("06-edge-rounded-orthogonal", svg);
  });

  test("edge jump arc crossing", () => {
    const svg = convert(xmlJumpArc);
    expect(svg).toContain(" C ");
    dump("07-edge-jump-arc", svg);
  });

  test("vertex linear gradient", () => {
    const xml = minimalMxfile.replace(
      "fillColor=#dae8fc;strokeColor=#6c8ebf;",
      "fillColor=#dae8fc;gradientColor=#ffffff;gradientDirection=east;strokeColor=#6c8ebf;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<linearGradient");
    dump("08-vertex-gradient", svg);
  });

  test("vertex rotation 45", () => {
    const xml = minimalMxfile.replace(
      '<mxGeometry x="100" y="80" width="120" height="60" as="geometry"/>',
      '<mxGeometry x="100" y="80" width="120" height="60" rotation="45" as="geometry"/>',
    );
    const svg = convert(xml);
    expect(svg).toContain("rotate(45");
    dump("09-vertex-rotation-45", svg);
  });

  test("vertex label background", () => {
    const xml = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;labelBackgroundColor=#e1d5e7;",
    );
    const svg = convert(xml);
    expect(svg).toContain("#e1d5e7");
    dump("10-vertex-label-background", svg);
  });

  test("vertex multiline br", () => {
    const xml = minimalMxfile.replace('value="Hello"', 'value="Line1&lt;br/&gt;Line2"');
    const svg = convert(xml);
    expect(svg).toContain("<tspan");
    dump("11-vertex-multiline-br", svg);
  });

  test("edge label fraction along path", () => {
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
    dump("12-edge-label-fraction", svg);
  });

  test("edge open arrows both ends", () => {
    const xml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "startArrow=open;endArrow=open;strokeColor=#82b366;",
    );
    const svg = convert(xml);
    expect(svg).toContain("marker-start");
    expect(svg).toContain("marker-end");
    dump("13-edge-open-arrows", svg);
  });

  test("rect rounded=1 proportional", () => {
    const xml = minimalMxfile.replace("rounded=0;", "rounded=1;");
    const svg = convert(xml);
    expect(svg).toMatch(/rx="12"/);
    dump("14-rect-rounded-proportional", svg);
  });

  test("vertex dashed stroke", () => {
    const xml = minimalMxfile.replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;dashed=1;");
    const svg = convert(xml);
    expect(svg).toContain("stroke-dasharray");
    dump("15-vertex-dashed", svg);
  });

  test("edge label background", () => {
    const xml = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="labeled" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;labelBackgroundColor=#fff2cc;">',
    );
    const svg = convert(xml);
    expect(svg).toContain("#fff2cc");
    dump("16-edge-label-background", svg);
  });

  test("vertex bold georgia", () => {
    const xml = minimalMxfile.replace(
      "strokeColor=#6c8ebf;",
      "strokeColor=#6c8ebf;fontStyle=1;fontFamily=Georgia;",
    );
    const svg = convert(xml);
    expect(svg).toContain('font-weight="bold"');
    expect(svg).toContain("Georgia");
    dump("17-vertex-font-bold-georgia", svg);
  });

  test("edge spacing center fallback", () => {
    const xml = minimalMxfile.replace(
      "endArrow=classic;strokeColor=#82b366;",
      "endArrow=classic;strokeColor=#82b366;spacing=12;",
    );
    const svg = convert(xml);
    expect(svg).toContain("<polyline");
    dump("18-edge-spacing", svg);
  });

  test("edge label padding", () => {
    const xml = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="pad" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;labelPadding=14;">',
    );
    const svg = convert(xml);
    expect(svg).toContain("pad");
    dump("19-edge-label-padding", svg);
  });

  test("rhombus source with edge spacing", () => {
    const xml = minimalMxfile
      .replace(
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "shape=rhombus;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      )
      .replace(
        "endArrow=classic;strokeColor=#82b366;",
        "endArrow=classic;strokeColor=#82b366;spacing=12;",
      );
    const svg = convert(xml);
    expect(svg).toContain("<path ");
    expect(svg).toContain("<polyline");
    dump("20-rhombus-edge-spacing", svg);
  });

  test("rotated ellipse source with edge spacing", () => {
    const xml = minimalMxfile
      .replace(
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "ellipse;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
      )
      .replace(
        '<mxGeometry x="100" y="80" width="120" height="60" as="geometry"/>',
        '<mxGeometry x="100" y="80" width="120" height="60" rotation="45" as="geometry"/>',
      )
      .replace(
        "endArrow=classic;strokeColor=#82b366;",
        "endArrow=classic;strokeColor=#82b366;spacing=12;",
      );
    const svg = convert(xml);
    expect(svg).toContain("<ellipse ");
    expect(svg).toContain("<polyline");
    dump("21-rotated-ellipse-edge-spacing", svg);
  });

  test("edge label overflow hidden (clip)", () => {
    const xml = minimalMxfile.replace(
      '<mxCell id="4" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;">',
      '<mxCell id="4" value="overflow clip" edge="1" parent="1" source="2" target="3" style="endArrow=classic;strokeColor=#82b366;fontSize=11;overflow=hidden;">',
    );
    const svg = convert(xml);
    const inner = svg.match(/<g data-mx2svg-edge="4"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(inner).toMatch(/<g clip-path="url\(#mx2svg-clip-\d+\)">/);
    dump("22-edge-label-overflow-hidden", svg);
  });

  test("vertex noLabel keeps shape only", () => {
    const xml = minimalMxfile.replace(
      'id="2" value="Hello" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"',
      'id="2" value="Hello" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;nolabel=1;"',
    );
    const svg = convert(xml);
    expect(svg).toContain("Circle");
    const inner = svg.match(/<g data-mx2svg-id="2"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? "";
    expect(inner).not.toContain("Hello");
    expect(inner).toContain("<rect ");
    dump("23-vertex-nolabel", svg);
  });

  test("vertex letterSpacing and lineHeight on multiline", () => {
    const xml = minimalMxfile
      .replace('value="Hello"', 'value="Line1&lt;br/&gt;Line2"')
      .replace("strokeColor=#6c8ebf;", "strokeColor=#6c8ebf;letterSpacing=2;lineHeight=200;");
    const svg = convert(xml);
    expect(svg).toContain('letter-spacing="2"');
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThanOrEqual(2);
    dump("24-vertex-letterspacing-lineheight", svg);
  });
});
