/**
 * 单测与 CLI 试跑共用的最小 draw.io XML，避免与磁盘上的重复 fixtures 漂移。
 * 若在编辑器里需要 `.drawio` 文件，可将本字符串粘贴保存或从仓库历史恢复。
 */

export const minimalMxfile = `<?xml version="1.0"?>
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
