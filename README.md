# mx2svg

将 **draw.io / diagrams.net**（`mxfile` / `mxGraphModel`）XML 转为 **SVG**。全新实现，与历史参考实现（如 drawio2svg）仅在建模概念上对齐，代码独立，**MIT** 许可。

## 当前能力（阶段 1）

- 解析 `<mxfile>` 下单页或多页；支持 **diagram 内压缩 payload**（base64 + raw deflate，与 draw.io 一致）。
- 解析 **顶点**（`vertex="1"`）与 **mxGeometry**（x, y, width, height）。
- 样式：`fillColor` / `strokeColor` / `strokeWidth` / `fontSize`；形状：`rect` 与 **独立 token `ellipse`** 或 `shape=ellipse`。
- **不渲染**：边（`edge="1"`）、折线/曲线、泳道、表格、UserObject 包装、HTML 富文本等（见下文路线图）。

## API

```ts
import { convert } from "mx2svg";

const svg = convert(xml, { pageIndex: 0, padding: 8, backgroundColor: "#fff" });
```

另可单独使用 `parseDrawioXml`、`renderToSvg` 做调试或自定义管线。

## 依赖

- `fast-xml-parser`：无 DOM 的 XML 解析（Node / Bun 均可）。
- `pako`：解压 diagram 内压缩内容。

## 路线图（分步迭代）

1. **阶段 2**：直线边（`edge="1"` + `mxGeometry` 点列 / 端点）。
2. **阶段 3**：圆角矩形、虚线、渐变（与 draw.io 样式子集对齐）。
3. **阶段 4**：简单 HTML 标签（或统一降级为纯文本策略）。
4. **阶段 5**：可选接入 **Pretext** 等做更准的多行文本折行与测量（当前为单行居中占位）。
5. **阶段 6**：常用 `shape=*`（菱形、圆柱等）用 SVG path 近似。

## 开发

```bash
bun install
bun test
```

## 与 blockplot 集成

可在 `@blockplot/drawio` 中将依赖改为 `file:../mx2svg`，再 `import { convert } from "mx2svg"`；集成变更建议在阶段 2 完成后再切换默认实现。
