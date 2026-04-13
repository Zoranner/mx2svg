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
});
