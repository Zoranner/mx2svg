import { describe, expect, test } from "bun:test";
import { deflate } from "pako";
import { convert } from "../convert.ts";
import { parseDrawioXml } from "../parse.ts";

/** 与 `parse/decompress.ts` 互逆：encodeURIComponent → raw deflate → base64（diagram `#text` 形态）。 */
function diagramPayloadFromInnerMxGraphModel(innerXml: string): string {
  const encoded = encodeURIComponent(innerXml);
  const bytes = new TextEncoder().encode(encoded);
  const compressed = deflate(bytes, { raw: true });
  let binary = "";
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]!);
  }
  return btoa(binary);
}

const bareMxGraphModel = `<?xml version="1.0"?>
<mxGraphModel dx="800" dy="600" grid="1" pageWidth="850" pageHeight="1100">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="BareRoot" vertex="1" parent="1" style="rounded=0;fillColor=#dae8fc;strokeColor=#6c8ebf;">
      <mxGeometry x="40" y="40" width="90" height="44" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`;

function twoPageMxfile(label0: string, label1: string): string {
  const page = (id: string, name: string, value: string) => `  <diagram id="${id}" name="${name}">
    <mxGraphModel dx="800" dy="600" pageWidth="850" pageHeight="1100">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="${value}" vertex="1" parent="1" style="rounded=0;fillColor=#dae8fc;strokeColor=#6c8ebf;">
          <mxGeometry x="50" y="50" width="100" height="40" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>`;
  return `<?xml version="1.0"?>
<mxfile host="app.diagrams.net">
${page("p1", "First", label0)}
${page("p2", "Second", label1)}
</mxfile>`;
}

describe("convert — 输入形态", () => {
  test("仅根元素为 mxGraphModel（无 mxfile）可解析并渲染", () => {
    const svg = convert(bareMxGraphModel);
    expect(svg).toContain("<svg");
    expect(svg).toContain("BareRoot");
    expect(svg).toContain("<rect");
  });

  test("多页 mxfile：pageIndex 选择第二页内容", () => {
    const xml = twoPageMxfile("Alpha", "Beta");
    const svg0 = convert(xml, { pageIndex: 0 });
    const svg1 = convert(xml, { pageIndex: 1 });
    expect(svg0).toContain("Alpha");
    expect(svg0).not.toContain("Beta");
    expect(svg1).toContain("Beta");
    expect(svg1).not.toContain("Alpha");
  });

  test("diagram 内压缩 payload（base64 raw deflate）可解压并渲染", () => {
    const inner = `<mxGraphModel dx="800" dy="600" pageWidth="850" pageHeight="1100"><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="CompressedOK" vertex="1" parent="1" style="rounded=0;fillColor=#dae8fc;strokeColor=#6c8ebf;">
<mxGeometry x="30" y="30" width="120" height="50" as="geometry"/></mxCell>
</root></mxGraphModel>`;
    const b64 = diagramPayloadFromInnerMxGraphModel(inner);
    const xml = `<?xml version="1.0"?><mxfile><diagram id="z" name="Z">${b64}</diagram></mxfile>`;
    const svg = convert(xml);
    expect(svg).toContain("<svg");
    expect(svg).toContain("CompressedOK");
  });

  test("UTF-8 标签（中文）保留在 SVG 中", () => {
    const xml = bareMxGraphModel.replace("BareRoot", "顶点标签·中文");
    const svg = convert(xml);
    expect(svg).toContain("顶点标签·中文");
  });

  test("文件头带 BOM 仍可解析", () => {
    const svg = convert(`\uFEFF${bareMxGraphModel}`);
    expect(svg).toContain("BareRoot");
  });

  test("整段 XML 首尾空白不影响", () => {
    const svg = convert(`  \n${bareMxGraphModel}\n  `);
    expect(svg).toContain("BareRoot");
  });

  test("ConvertOptions：backgroundColor 作用于背景矩形", () => {
    const svg = convert(bareMxGraphModel, { backgroundColor: "#aabbcc" });
    expect(svg).toContain('fill="#aabbcc"');
  });

  test("ConvertOptions：padding 出现在 viewBox 尺度中（略大于仅几何时）", () => {
    const tight = convert(bareMxGraphModel, { padding: 0 });
    const loose = convert(bareMxGraphModel, { padding: 40 });
    const vbT = tight.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/) ?? [];
    const vbL = loose.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/) ?? [];
    const wT = Number(vbT[2]);
    const wL = Number(vbL[2]);
    expect(Number.isFinite(wT) && Number.isFinite(wL)).toBe(true);
    expect(wL - wT).toBeCloseTo(80, 0);
  });

  test("ConvertOptions：defaultFontStack 作用于无 fontFamily 的标签", () => {
    const svg = convert(bareMxGraphModel, { defaultFontStack: "Georgia, serif" });
    expect(svg).toContain("Georgia");
    expect(svg).toContain("BareRoot");
  });

  test("ConvertOptions：defaultVertexFontSize 作用于无 fontSize 的顶点", () => {
    const svg = convert(bareMxGraphModel, { defaultVertexFontSize: 21 });
    expect(svg).toContain('font-size="21"');
    expect(svg).toContain("BareRoot");
  });
});

describe("convert — 错误输入", () => {
  test("空字符串抛出", () => {
    expect(() => convert("")).toThrow(/expected <mxfile> or <mxGraphModel>/);
  });

  test("无 mxfile / mxGraphModel 抛出", () => {
    expect(() => convert("<hello/>")).toThrow(/expected <mxfile> or <mxGraphModel>/);
  });

  test("mxfile 下 diagram 无几何内容时无可解析页抛出", () => {
    expect(() =>
      convert('<?xml version="1.0"?><mxfile><diagram id="empty" name="E"></diagram></mxfile>'),
    ).toThrow(/no parsable diagram pages/);
  });

  test("pageIndex 越界抛出", () => {
    const xml = twoPageMxfile("A", "B");
    expect(() => convert(xml, { pageIndex: 2 })).toThrow(/pageIndex 2 out of range/);
  });
});

describe("parseDrawioXml — 与 convert 输入一致", () => {
  test("bare mxGraphModel 得到单页 default id", () => {
    const doc = parseDrawioXml(bareMxGraphModel);
    expect(doc.pages.length).toBe(1);
    expect(doc.pages[0]!.id).toBe("default");
    expect(doc.pages[0]!.nodes.some((n) => n.label === "BareRoot")).toBe(true);
  });

  test("多页顺序与 diagram 顺序一致", () => {
    const doc = parseDrawioXml(twoPageMxfile("A", "B"));
    expect(doc.pages.map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});
