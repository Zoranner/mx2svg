# mx2svg

将 **draw.io / diagrams.net**（`mxfile` / `mxGraphModel`）XML 转为 **SVG**。实现独立于既有工具（如 drawio2svg），仅在「图元 / 几何」概念上可对齐参考。**MIT** 许可。

## 快速开始

```bash
bun install
bun test
```

跑完测试会在 **`mx2svg/.test-output/`** 生成示例 SVG（**已 `.gitignore`**）：**`cli/`** 来自 CLI 单测，**`convert/`** 来自 **`src/testing/convert-output.test.ts`**（24 张典型图，便于对照）。

**代码风格**：[Biome](https://biomejs.dev/)（`biome.json`），**`.editorconfig`** 约定缩进。

```bash
bun run format          # 格式化并写回
bun run format:check    # 仅检查（适合 CI）
bun run check           # 格式化 + 整理 import（写回）
```

## 作为库使用

把 XML 当字符串传入即可（读文件、接口、内联字面量均可），**不必使用 CLI**。

```ts
import { convert } from "mx2svg";

const svg = convert(drawioXml, {
  pageIndex: 0,
  padding: 8,
  backgroundColor: "#fff",
  defaultFontStack: "Inter, system-ui, sans-serif", // 可选：无 fontFamily 时使用
});
```

需要介入中间步骤时，可拆开 **`parseDrawioXml`**（XML → **`DiagramDoc`**）与 **`renderToSvg`**（**`DiagramDoc`** → SVG）。**`DiagramDoc`**、**`DiagramPage`**、**`DiagramNode`** 等类型由 **`index`** 导出，定义在 **`src/core/model.ts`**。

## 命令行

- **文件**（默认与输入同目录、同主名 `.svg`）：

```bash
bun run render -- path/to/diagram.drawio
bun run ./src/cli.ts path/to/diagram.drawio -o /path/to/out.svg
```

- **XML 字符串**（无 **`-o`** 时 SVG 输出到 **stdout**）。最小样例见 **`src/testing/test-fixtures.ts`**（`minimalMxfile`）：

```bash
bun run ./src/cli.ts -s "<?xml version=\"1.0\"?><mxfile>...</mxfile>"
bun run ./src/cli.ts -s "<mxfile>...</mxfile>" -o out.svg
```

- **标准输入**：用 **`-`** 占位（无 **`-o`** 则 stdout）。

```bash
type path\to\diagram.drawio | bun run ./src/cli.ts -
```

常用选项：`--page`、`--padding`、`--bg`、**`--font-stack`**（同 **`defaultFontStack`**）；**`--help`** 查看全部说明。

## 仓库结构（`src/`）

顶层入口只做组装或再导出，领域代码按目录拆分：

| 路径 | 职责 |
|------|------|
| **`index.ts`** | 对外导出 `convert`、`parseDrawioXml`、`renderToSvg`、`decompressDiagramInner` 与 IR 类型 |
| **`convert.ts`** | `parseDrawioXml` → `renderToSvg` |
| **`parse.ts`** | 顶层 XML / 多页 /内嵌 diagram 调度 |
| **`render.ts`** | 再导出 `renderToSvg` 与 **`RenderOptions`** |
| **`cli.ts`** | 命令行入口 |
| **`core/model.ts`** | IR：`DiagramDoc`、`DiagramNode`、`DiagramEdge` 等 |
| **`parse/`** | `xml-parser`、`xml-helpers`、`decompress`、`mx-geometry`、`graph-model`、`diagram-payload`、`style`（`parseMxStyle` / `inferShape`）、`edge-endpoints`（中心连线 **`spacing`**） |
| **`render/`** | `render-to-svg`、`render-vertex`、`render-edge`、边折线度量、标签锚点、SVG 工具与选项 |
| **`edge/`** | 箭头、曲线 / 圆角 / 跳线、**`spacing`** 端点、折线工具 |
| **`shape/`** | 顶点 `path` 与凸包轮廓（与 **`spacing`** 求交一致） |
| **`text/`** | `mx-font`、`wrap-label`、`pretext-shim`、`mx-label-plain` |
| **`testing/`** | 集成与 CLI 单测、`test-fixtures`、`test-svg-dump` |

## 依赖

| 包 | 作用 |
|----|------|
| `fast-xml-parser` | 无 DOM 的 XML 解析（Node / Bun） |
| `pako` | diagram 内 **base64 + raw deflate**（与 draw.io 一致） |
| `@chenglou/pretext` | **`whiteSpace=wrap`** 时折行与测宽 |
| `@napi-rs/canvas` | 非浏览器环境下的 Canvas 2D / **`OffscreenCanvas`** 垫片（`src/text/pretext-shim.ts`） |

## 功能参考

### 解析与页面

- **`<mxfile>`** 下单页或多页。
- 支持 **diagram 内压缩 payload**（与 diagrams.net 导出一致）。

### 顶点

- **`vertex="1"`** 与 **`mxGeometry`**：位置、宽高、**`rotation`**（度，绕中心；影响 `viewBox`与 `transform`；仅旋转时仍为 **`rotate(deg, cx, cy)`**）。**`mxCell`** 的 **`tooltip`** 属性 →图元 **`<g>`** 内 **`<title>`**（浏览器原生悬停提示）。
- **样式（节选）**：**`noLabel=1`** 或 **`noLabel=true`**（键 **`nolabel`**）：不渲染 **`value` 文本**，形状或连线仍输出。**`letterSpacing`**（键 **`letterspacing`**）：合法数字时输出 SVG **`letter-spacing`**。**`lineHeight`**（键 **`lineheight`**）：**`≤4`** 视为相对字号的倍数（如 **`1.2`**）；**`5～500`** 视为百分比（如 **`150`** = 150%）；缺省 **1.2×**字号；影响 **`whiteSpace=wrap`** 测高与多行 **`tspan`** 行距。**`link`**：标签（衬底 + 文字）外包 SVG **`<a href="…" target="_blank" rel="noopener noreferrer">`**。**`overflow=hidden`** 或 **`clip`**：顶点标签裁剪到 **`vertexLabelLayoutRect`** 标签区（**`<clipPath>`**写入 **`defs`**）。**`fillColor` / `strokeColor`** 显式 **`none`** 时分别关闭填充/描边（与 **`colorOr` 默认回退**不同）；**`strokeWidth=0`** 视为无描边。**`shadow=1`**：整图元近似投影（**`<defs>`** 内 **`feGaussianBlur` + `feOffset`**，**`filter="url(#mx2svg-drop-shadow)"`**）。**`flipH` / `flipV`**（键 **`fliph`**、**`flipv`**）：绕几何中心镜像；与 **`rotation`** 同时存在时顺序为 **平移 → 旋转 → 缩放 → 平移回**。**`spacing`**、**`spacingLeft`**、**`spacingRight`**、**`spacingTop`**、**`spacingBottom`**（键小写）：在默认 **8px** 标签区内边距上叠加；仅设 **`spacing`** 时四边共用该值，单边键存在时该边优先于 **`spacing`**（与 **`whiteSpace=wrap`** 时可用行宽一致）。**`fillColor`**、**`strokeColor`**、**`strokeWidth`**、`fontSize`、`fontColor`、**`labelBackgroundColor`**（测宽测高后圆角衬底）、**`labelBorderColor` / `labelBorderWidth`**（衬底矩形描边；宽默认 **1**）、**`double=1`**（**`rect`** / **`ellipse`** 双线框：先整块填充，再外缘与内缩描边；无描边时不画双线）、**`align` / `verticalAlign`**（在内缩标签区内布置标签块，语义与边标签相同；**`document`** 时底边为折痕上方）、**`opacity`**（整图元 `<g>`，与下两项相乘）、**`fillOpacity` / `strokeOpacity`**（style 键 **`fillopacity`**、**`strokeopacity`**；仅作用于填充或描边，数值规则同 **`opacity`**）、**`linecap` / `linejoin`**（键小写；**`linecap`**：`flat`→SVG `butt`，及 **`square`**、**`round`**；**`linejoin`**：**`miter`**、**`round`**、**`bevel`**；未设时 **`path` 形状**仍为 **`linejoin=round`**，**`rect`/`ellipse`** 不强行改 SVG 默认）、**`miterLimit` / `strokeMiterlimit`**（键 **`miterlimit`** 或 **`strokemiterlimit`**，输出 SVG **`stroke-miterlimit`**）、矩形 **`rounded`** / **`arcSize`**、**`dashed`** / **`dash=1`**（默认 **`6 4`**，不按线宽缩放）、**`dashPattern`**（键 **`dashpattern`**；逗号或空白分隔正数，映射 **`stroke-dasharray`**，优先于默认虚线；未设 **`fixDash=1`** 时各段按当前 **`strokeWidth`** 缩放）、**`fixDash`**（键 **`fixdash`**；**`1`/`true`** 时 **`dashPattern`** 为固定像素）、**`fontOpacity`**（键 **`fontopacity`**；标签文字 **`fill-opacity`**，规则同 **`opacity`**）、**线性渐变**（`gradientColor` + `gradientDirection`，`objectBoundingBox`；**`fillColor=none`** 时不生成渐变）。
- **形状**（SVG `path` / `line` 近似，与 draw.io **非像素级**一致）：

  | 类型 | 说明 |
  |------|------|
  | 默认 | `rect`；`ellipse`（`ellipse` token 或 `shape=ellipse` / `circle`） |
  | 多边形 / 流程图常用 | `rhombus`、`diamond`、`hexagon`、`pentagon`、`parallelogram`、`triangle`（`direction`：north / south / east / west）、`trapezoid` |
  | 其它 | `cylinder` / `cylinder2` / `cylinder3`、`cloud`、`document`（可选 **`size`** 褶高比例，默认 `0.3`；**标签锚点在折痕上方区域中心**）、`dataStorage`（可选 **`size`** 左侧弧；`fixedSize=1` 时为像素）、`internalStorage`（`dx`/`dy`，**`rounded=1`** 时 **`arcSize`**） |

### 边

- **几何**：`sourcePoint` → **`Array`** 路点 → `targetPoint`；若无点仅有 **`source` + `target`**，则连两顶点中心。
- **路由**（优先级：**跳线 > 曲线 > 圆角 > 折线**）
  - **`curved=1`**：二次贝塞尔（`<path d="M…Q…">`）；标签与边界按曲线密化近似。
  - **`rounded=1`** 且路点 ≥ **3**：正交拐角 **`L` + `Q`**（可用 **`arcSize`** 覆盖默认弧）。
  - **`jumpStyle=arc`**（可选 **`jumpSize`**，默认 6）：与其它边**折线路点**求交处画跨越弧；**`noJump=1`** 不参与；**`curved=1`** 或 **`noJump=1`** 不画跳线。
- **样式**：**`dashed`** / **`dash=1`**、**`dashPattern`**、**`fixDash`**（同顶点）；**`linecap` / `linejoin`**（折线/曲线；未设时 **`round`/`round`**，与常见连接器一致）；**`miterLimit` / `strokeMiterlimit`**（同顶点）；**`strokeColor=none`** 或 **`strokeWidth=0`**：几何为 **`stroke="none"`**，且不输出 **marker**；**`endSize` / `startSize`**（键小写）：箭头 marker相对默认 **6** 的比例缩放（约 **0.35～5**），**`id`** 在比例非 **1** 时带后缀以区分；**`noLabel`**、**`letterSpacing`**、**`lineHeight`**（同顶点，作用于边标签）；**`overflow=hidden`** / **`clip`**：边标签块外包 **`<g clip-path="url(#…)">`**，裁剪框按标签几何与 **`labelBackgroundColor`** 衬底（若有）计算；**`link`**（同顶点）：边标签外包 **`<a>`**；**`mxCell`** 的 **`tooltip`**（同顶点）→ **`<title>`**；**`opacity`**（整条边 `<g>`，含箭头与标签）；**`strokeOpacity`**（折线/曲线描边；键 **`strokeopacity`**）；**`fillOpacity`**（若有边标签衬底矩形）；**`labelBorderColor` / `labelBorderWidth`**（边标签衬底描边，同顶点）；**`endArrow` / `startArrow`**（`none`、`open`、`oval`/`dot`、`diamond`、`classic`/`block` 等）；marker 与 **`strokeColor`** 一致；未设 **`startArrow`** 则起点无箭头；**`fontSize` / `fontColor` / `fontStyle` / `fontFamily`** 作用于边标签。
- **`spacing`**（**边**样式）：仅在**无**显式 `sourcePoint`/`targetPoint`、解析回退为**中心连线**时生效：穿出形状周界后再内收 **`spacing`**。**`ellipse`**（含旋转）用局部椭圆求交；**`rhombus` / `hexagon` / … / `pentagon`** 与 **`shape-path`** 一致的凸多边形（支持旋转）；**`cloud` / `cylinder` / `document` / `dataStorage`** 用与 **`shape-path`** 相同的曲线密化折线求交（支持旋转）；**`rect` / `internalStorage`** 等用轴对齐框；旋转矩形在局部未旋转系。（**顶点**上的 **`spacing`** 见上文「标签区内边距」，与边端点 **`spacing`** 语义不同。）
- **边标签锚点**：默认路径**中点**；**`mxPoint as="label"`** 且 **`x` ∈ [0,1]** 为弧长比例 + 法向 **`y`**；**`relative=1`** 且带 **`x`/`y`** 为相对中点平移。
- **边标签折行**：**`whiteSpace=wrap`** 时以 **`mxGeometry` 的 `width`（>0）** 为最大行宽；否则用与字号相关的默认宽。
- **`labelPadding`**：沿路径法向叠加（与比例 label 的 **`y`**、**`relative`** 中点偏移同向）；**绝对 label 坐标**（**`x` ∉ [0,1]**）不做法向叠加。
- **`labelBackgroundColor`**：圆角衬底；有衬底时不再加白色描边晕圈。可选 **`labelBorderColor`**、**`labelBorderWidth`** 为衬底加描边。
- **`align` / `verticalAlign`**（style 解析为小写键 **`align`**、**`verticalalign`**）：相对路径锚点布置标签内容盒。水平 **`left` / `center` / `right`**（默认 **`center`**）；垂直 **`top` / `middle` / `bottom`**（默认 **`middle`**）。无衬底时平移文字块中心；有衬底时平移圆角矩形，文字仍在衬底内居中。多行时水平对齐还映射为 SVG **`text-anchor`**（`start` / `middle` / `end`），各行相对块中心左齐、居中或右齐。

### 标签与文本

- **`value`** 中 HTML 经 **`mxLabelToPlainText`** 降为纯文本（行内空白折叠）。
- **显式多行**：`</p>`、`</div>`、`</tr>`、`<br>`、源码换行等 →多行 **`tspan`**。各行 **`y`** 为 **alphabetic baseline**；若仅把「基线梯」的中点对准 **`cy`**，相对单行 **`dominant-baseline="middle"`**（em 中点）会整体**偏上**。实现上用与 Pretext 相同的 **Canvas `measureText`**（**`@napi-rs/canvas`**）取 ascent/descent，把整段墨迹的垂直中心对齐到 **`cy`**（顶点与边标签共用 **`renderSvgLabelBlock`**）。
- **顶点 `whiteSpace=wrap`**：框内软折行；测量与 SVG 使用同一 **`fontFamily`**（未设时为 **`Arial, Helvetica, sans-serif`**）、**`fontStyle`** 位（**`1`** 粗、**`2`** 斜、**`4`** 下划线，可相加）、**`lineHeight`** 与 **`letterSpacing`**（见顶点样式节选）。
- **`fontOpacity`**（顶点/边 style）：作用于 **`value` 渲染的 `<text>`**，与图元 **`opacity`** 相乘。

## 局限与路线图

### 已知局限

- **`fontStyle` / `fontFamily`** 已映射到 SVG 与测量，与编辑器完全一致仍受系统字体影响。
- 标签为**纯文本**，无 HTML 内联富文本。
- **`jumpStyle`** 目前仅 **`arc`**。
- **泳道、表格、`UserObject`、嵌入图片、大量 stencil** 等未完整覆盖。

### 进度与排期取向

当前能力已能覆盖大量**流程图与简单架构图**；若要逼近 draw.io 全量文档，中长期缺口主要在 **泳道 / 表格 / 富文本 / stencil**，而非基础折线与形状。

| 档位 | 含义 | 示例 |
|------|------|------|
| 小 | 管线内增量 | 箭头变体；**`spacing`** 与复杂形状周界精细化 |
| 中 | 多处联动 | 其它 **`jumpStyle`**；更多 **`shape`**；分组与绘制顺序 |
| 大 | 子项目级 | 泳道；表格；**`foreignObject`**；**`image`**；大范围 stencil |

**分阶段（非承诺）**

- **近期**：曲线轮廓（云、文档等）的 **`spacing`** 更准周界（**`cloud` / `cylinder` / `document` / `dataStorage`** 已接轮廓折线；其它 stencil 仍可能近似）；边标签其它细项（多行相对锚点的基线微调等）。
- **中期**：**`jumpStyle`** / **`shape`** / 箭头扩展；**`parent`** 层级；垂直度量与多行基线。
- **长期**：泳道、表格、`UserObject`；富文本与图片；**`RenderOptions`** 主题化。

若业务只关心某一类图，建议**收窄 stencil 范围**再排期，避免一次性做满全库。
