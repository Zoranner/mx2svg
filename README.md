# mx2svg

将 **draw.io / diagrams.net**（`mxfile` / `mxGraphModel`）XML 转为 **SVG**。全新实现，与历史参考实现（如 drawio2svg）仅在建模概念上对齐，代码独立，**MIT** 许可。

## 当前能力（阶段 1–6）

- 解析 `<mxfile>` 下单页或多页；支持 **diagram 内压缩 payload**（base64 + raw deflate，与 draw.io 一致）。
- 解析 **顶点**（`vertex="1"`）与 **mxGeometry**（x, y, width, height、**rotation** 度，绕中心；影响 `viewBox` 与 `transform`）。
- 样式：`fillColor` / `strokeColor` / `strokeWidth` / `fontSize` / **`fontColor`**（顶点与边标签文字）/ **`labelBackgroundColor`**（顶点标签衬底，Pretext 测宽测高后画圆角矩形）；形状：`rect`、**`ellipse`**（token或 `shape=ellipse`/`circle`）、**`shape=rhombus`/`diamond`、`hexagon`、`pentagon`、`parallelogram`、`cylinder`/`cylinder2`/`cylinder3`、`triangle`（可选 `direction=north|south|east|west`，默认 north）、`trapezoid`、`cloud`、`document`**（`document` 可选 **`size`** 控制底部褶高占高度比例，默认 `0.3`；**标签锚点在折痕上方区域中心**）、**`dataStorage`**（可选 **`size`** 为左侧弧宽：比例或 `fixedSize=1` 时像素）、**`internalStorage`**（矩形 + 分割线，可选 **`dx`/`dy`** 默认 15、**`rounded=1`** 时 **`arcSize`** 百分数圆角，与 draw.io 语义一致）（SVG `path`/`line` 近似，与 draw.io 非像素级一致）。
- **边**（阶段 2+）：`edge="1"`，从 `mxGeometry` 的 `sourcePoint` / `Array` 中间点 / `targetPoint` 取折线；若无点但有 `source`+`target`，则连接两顶点中心。支持 **`curved=1`**：路径为与 draw.io 一致的 **二次贝塞尔**分段（SVG `<path d="M…Q…">`），标签锚点与 `viewBox` 按曲线密化近似。支持 **`rounded=1`** 且路点不少于 **3** 个时：正交折线 **拐角圆角**（`L` + `Q`，默认弧参数与 draw.io `LINE_ARCSIZE` 一致，可用 **`arcSize`** 覆盖）。支持 **`jumpStyle=arc`**（可选 **`jumpSize`**，默认 6）：与其它边 **路点折线** 相交处画跨越弧（`C`三次贝塞尔）；**`noJump=1`** 的边不参与相交检测；**`curved=1`** 或 **`noJump=1`** 的边不画跳线。路径优先级：**跳线** > **曲线** > **圆角** > **折线**。支持 `dashed`、`endArrow`（默认三角箭头，可为 `none`/`open` 等）、显式 **`startArrow`**（非 `none` 时在路径起点画三角箭头）。**边标签**（`value`）默认在路径 **总长中点**；若存在 **`mxPoint as="label"`** 且 **`x` 在 [0,1]**，则按该比例取路径上一点并做法向 **`y`** 像素偏移；若 **`relative=1`** 且 geometry 带 **`x`/`y`**，则视为相对中点的平移。`fontSize` 默认 11，文本带浅色描边；标签文本与顶点相同经 HTML/实体与多行规则处理。
- **阶段 3**：矩形 **圆角**（`rounded=1` 比例圆角、`rounded=N` 像素半径、`rounded=0` 关闭；可选 `arcSize`）；顶点与边的 **虚线描边**（`dashed`）；**线性渐变**（`gradientColor` + `gradientDirection`：`north`/`south`/`east`/`west` 及四角别名，`objectBoundingBox`）。
- **阶段 4**：顶点/边 `value` 中常见 **HTML 片段**与实体 **降级为纯文本**（行内空白折叠）。
- **阶段 5（子集）**：**显式多行**——`</p>`、`</div>`、`</tr>`、`<br>` 与源码换行等产生逻辑行，SVG 内用 **`<tspan>` 垂直堆叠**并在形状内大致居中。若样式含 **`whiteSpace=wrap`**，顶点标签在框内用 **[Pretext](https://github.com/chenglou/pretext)**（`prepareWithSegments` + `layoutWithLines`）按 **`Arial, Helvetica, sans-serif`** 与字号测量折行；CLI/Bun 下通过 **`@napi-rs/canvas`** 注入 `OffscreenCanvas` 垫片以提供 `measureText`。
- **阶段 6**：常用 **`shape=*`** 的 path 近似（见上）；`rounded` 仅作用于默认矩形。
- **仍不渲染**：泳道、表格、UserObject 包装、HTML 内联富文本（仅单元级 `fontColor` / `labelBackgroundColor` 等）、更多 stencil 形状等（见路线图）。

## API

```ts
import { convert } from "mx2svg";

const svg = convert(xml, { pageIndex: 0, padding: 8, backgroundColor: "#fff" });
```

另可单独使用 `parseDrawioXml`、`renderToSvg` 做调试或自定义管线。

## 依赖

- `fast-xml-parser`：无 DOM 的 XML 解析（Node / Bun 均可）。
- `pako`：解压 diagram 内压缩内容。
- `@chenglou/pretext`：顶点 `whiteSpace=wrap` 时的折行与宽度测量。
- `@napi-rs/canvas`：在非浏览器环境为 Pretext 提供 Canvas 2D（`OffscreenCanvas` 垫片，见 `src/pretext-shim.ts`）。

## 路线图（分步迭代）

1. **阶段 5+**：更细的垂直度量、边标签折行、与 draw.io 完全一致的字体栈选项等。
2. **阶段 7+**：更多 `shape=*`（泳道等）、表格等。

## 开发

```bash
bun install
bun test
```

## 与 blockplot 集成

可在 `@blockplot/drawio` 中将依赖改为 `file:../mx2svg`，再 `import { convert } from "mx2svg"`（与仓库根目录的相对路径按实际 monorepo 调整）。
