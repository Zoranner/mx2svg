# mx2svg

将 **draw.io / diagrams.net**（`mxfile` / `mxGraphModel`）XML 转为 **SVG**。全新实现，与历史参考实现（如 drawio2svg）仅在建模概念上对齐，代码独立，**MIT** 许可。

## 当前能力（阶段 1–6）

- 解析 `<mxfile>` 下单页或多页；支持 **diagram 内压缩 payload**（base64 + raw deflate，与 draw.io 一致）。
- 解析 **顶点**（`vertex="1"`）与 **mxGeometry**（x, y, width, height）。
- 样式：`fillColor` / `strokeColor` / `strokeWidth` / `fontSize`；形状：`rect`、**`ellipse`**（token或 `shape=ellipse`/`circle`）、**`shape=rhombus`/`diamond`、`hexagon`、`parallelogram`、`cylinder`/`cylinder2`/`cylinder3`**（SVG `path` 近似，与 draw.io 非像素级一致）。
- **边**（阶段 2）：`edge="1"`，从 `mxGeometry` 的 `sourcePoint` / `Array` 中间点 / `targetPoint` 取折线；若无点但有 `source`+`target`，则连接两顶点中心。支持 `dashed`、`endArrow`（非 `none`/`open` 时画三角箭头）。
- **阶段 3**：矩形 **圆角**（`rounded=1` 比例圆角、`rounded=N` 像素半径、`rounded=0` 关闭；可选 `arcSize`）；顶点与边的 **虚线描边**（`dashed`）；**线性渐变**（`gradientColor` + `gradientDirection`：`north`/`south`/`east`/`west` 及四角别名，`objectBoundingBox`）。
- **阶段 4**：顶点/边 `value` 中常见 **HTML 片段**与实体 **降级为纯文本**（行内空白折叠）。
- **阶段 5（子集）**：**显式多行**——`</p>`、`</div>`、`</tr>`、`<br>` 与源码换行等产生逻辑行，SVG 内用 **`<tspan>` 垂直堆叠**并在形状内大致居中；**不按框宽自动折行**、不做字形测量（可选后续接入 Pretext 等）。
- **阶段 6**：常用 **`shape=*`** 的 path 近似（见上）；`rounded` 仅作用于默认矩形。
- **仍不渲染**：曲线边、泳道、表格、UserObject 包装、富文本样式（颜色/粗体等）、更多 stencil 形状等（见路线图）。

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

1. **阶段 5+**：可选 **Pretext** 等——按框宽自动折行、更准的垂直度量与对齐。
2. **阶段 7+**：更多 `shape=*`（三角形、梯形、泳道等）、曲线边、表格等。

## 开发

```bash
bun install
bun test
```

## 与 blockplot 集成

可在 `@blockplot/drawio` 中将依赖改为 `file:../mx2svg`，再 `import { convert } from "mx2svg"`（与仓库根目录的相对路径按实际 monorepo 调整）。
