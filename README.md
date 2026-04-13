# mx2svg

将 **draw.io / diagrams.net**（`mxfile` / `mxGraphModel`）XML 转为 **SVG**。全新实现，与历史参考实现（如 drawio2svg）仅在建模概念上对齐，代码独立，**MIT** 许可。

## 当前能力（阶段 1–4）

- 解析 `<mxfile>` 下单页或多页；支持 **diagram 内压缩 payload**（base64 + raw deflate，与 draw.io 一致）。
- 解析 **顶点**（`vertex="1"`）与 **mxGeometry**（x, y, width, height）。
- 样式：`fillColor` / `strokeColor` / `strokeWidth` / `fontSize`；形状：`rect` 与 **独立 token `ellipse`** 或 `shape=ellipse`。
- **边**（阶段 2）：`edge="1"`，从 `mxGeometry` 的 `sourcePoint` / `Array` 中间点 / `targetPoint` 取折线；若无点但有 `source`+`target`，则连接两顶点中心。支持 `dashed`、`endArrow`（非 `none`/`open` 时画三角箭头）。
- **阶段 3**：矩形 **圆角**（`rounded=1` 比例圆角、`rounded=N` 像素半径、`rounded=0` 关闭；可选 `arcSize`）；顶点与边的 **虚线描边**（`dashed`）；**线性渐变**（`gradientColor` + `gradientDirection`：`north`/`south`/`east`/`west` 及四角别名，`objectBoundingBox`）。
- **阶段 4**：顶点/边 `value` 中常见 **HTML 片段**（如 `<p>`、`<font>`、`<br>`）与实体（`&amp;`、`&lt;` 等）**降级为纯文本**；空白折叠为单行，与当前居中 `<text>` 策略一致（多行折行/测量见阶段 5）。
- **仍不渲染**：曲线边、泳道、表格、UserObject 包装、富文本样式（颜色/粗体等）等（见路线图）。

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

1. **阶段 5**：可选接入 **Pretext** 等做更准的多行文本折行与测量（当前为单行居中占位）。
2. **阶段 6**：常用 `shape=*`（菱形、圆柱等）用 SVG path 近似。

## 开发

```bash
bun install
bun test
```

## 与 blockplot 集成

可在 `@blockplot/drawio` 中将依赖改为 `file:../mx2svg`，再 `import { convert } from "mx2svg"`（与仓库根目录的相对路径按实际 monorepo 调整）。
