# mx2svg

将 **draw.io / diagrams.net**（`mxfile` / `mxGraphModel`）XML 转为 **SVG**。实现独立于既有工具（如 drawio2svg），仅在「图元 / 几何」概念上可对齐参考；**MIT** 许可。

## 安装与用法

```bash
bun install
bun test
```

跑完测试后，**`mx2svg/.test-output/`** 下会生成 SVG（已 **`.gitignore`**，不提交）：

- **`cli/`**：CLI 单测（`string-stdout.svg`、`string-o.svg`）
- **`convert/`**：**`convert-output.test.ts`** 写入的 **18+** 张典型图（底图、菱形/云/文档、曲线/圆角/跳线边、渐变、旋转、顶点/边标签衬底、字体样式、边 **`spacing`**、边标签比例、双开箭头等），便于逐项打开对照

### 程序化集成（开发中直接使用）

**不需要 CLI**：把 `drawioXml` 当普通字符串传入即可（读文件、接口返回、内联字面量都行）。

```ts
import { convert } from "mx2svg";

const svg = convert(drawioXml, { pageIndex: 0, padding: 8, backgroundColor: "#fff" });
// svg 为完整 SVG 文档字符串，可写文件、塞进 HTTP 响应、交给前端展示等
```

需要改解析/渲染中间步骤时，可拆开使用 **`parseDrawioXml`**（XML → `DiagramDoc`）与 **`renderToSvg`**（`DiagramDoc` → SVG）。类型见 **`DiagramDoc`**、**`DiagramPage`** 等导出。

在 monorepo 里可把依赖写成 `"mx2svg": "workspace:*"` 或 `"file:../mx2svg"`，再同样 `import { convert } from "mx2svg"`。

### 命令行出图（可选，便于目视验证）

- **文件**（默认写出与输入同目录、同主文件名 `.svg`）：

```bash
bun run render -- path/to/diagram.drawio
bun run ./src/cli.ts path/to/diagram.drawio -o /path/to/out.svg
```

- **XML 字符串**（适合脚本与小片段；**无 `-o` 时 SVG 打到标准输出**，便于重定向或管道）。开发与单测共用的最小示例见 **`src/test-fixtures.ts`**（`minimalMxfile`），可复制为文件或拼进 `-s`：

```bash
bun run ./src/cli.ts -s "<?xml version=\"1.0\"?><mxfile>...</mxfile>"
bun run ./src/cli.ts -s "<mxfile>...</mxfile>" -o out.svg
```

- **标准输入**：用 `-` 占位，行为与 `-s` 相同（无 `-o` 则 stdout）。

```bash
type path\to\diagram.drawio | bun run ./src/cli.ts -
```

常用选项：`--page <n>`、`--padding <n>`、`--bg <颜色>`；`--help` 查看全部说明。

## 依赖

| 包 | 作用 |
|----|------|
| `fast-xml-parser` | 流式友好、无 DOM 的 XML 解析（Node / Bun） |
| `pako` | 与 draw.io 一致的 diagram 内 **base64 + raw deflate** 解压 |
| `@chenglou/pretext` | `whiteSpace=wrap` 时顶点与边标签的折行与宽度测量 |
| `@napi-rs/canvas` | 为非浏览器环境提供 Canvas 2D（`OffscreenCanvas` 垫片，见 `src/pretext-shim.ts`） |

## 功能说明

### 解析与页面

- 读取 `<mxfile>` 下的**单页或多页**。
- 支持 **diagram 内压缩 payload**（与 diagrams.net 导出一致）。

### 顶点

- **`vertex="1"`** 与 **`mxGeometry`**：位置、宽高、**`rotation`**（度，绕中心；影响 `viewBox` 与 `transform`）。
- **样式（节选）**：`fillColor`、`strokeColor`、`strokeWidth`、`fontSize`、`fontColor`、**`labelBackgroundColor`**（Pretext 测宽测高后绘制圆角衬底）、矩形 **`rounded`** / **`arcSize`**、**`dashed`**、**线性渐变**（`gradientColor` + `gradientDirection`，`objectBoundingBox`）。
- **形状**（SVG `path` / `line` 近似，与 draw.io **非像素级**一致）：

  | 类型 | 说明 |
  |------|------|
  | 默认 | `rect`；`ellipse`（`ellipse` token 或 `shape=ellipse` / `circle`） |
  | 多边形 / 流程图常用 | `rhombus`、`diamond`、`hexagon`、`pentagon`、`parallelogram`、`triangle`（`direction`：north / south / east / west）、`trapezoid` |
  | 其它 | `cylinder` / `cylinder2` / `cylinder3`、`cloud`、`document`（可选 **`size`** 褶高比例，默认 `0.3`；**标签锚点在折痕上方区域中心**）、`dataStorage`（可选 **`size`** 左侧弧；`fixedSize=1` 时为像素）、`internalStorage`（`dx`/`dy`，**`rounded=1`** 时 **`arcSize`**） |

### 边

- **几何**：`sourcePoint` → `Array` 路点 → `targetPoint`；若无点仅有 **`source` + `target`**，则连接两顶点中心。
- **路由（优先级：跳线 > 曲线 > 圆角 > 折线）**
  - **`curved=1`**：与 draw.io 一致的**二次贝塞尔**（`<path d="M…Q…">`）；标签与边界框按曲线密化近似。
  - **`rounded=1`**且路点 ≥ **3**：正交折线拐角 **`L` + `Q`**（默认贴近 `LINE_ARCSIZE`，可用 **`arcSize`** 覆盖）。
  - **`jumpStyle=arc`**（可选 **`jumpSize`**，默认 6）：与其它边**路点折线**求交处画跨越弧（`C`）；**`noJump=1`** 不参与检测；**`curved=1`** 或 **`noJump=1`** 不画跳线。
- **样式**：`dashed`；**`endArrow` / `startArrow`**（`none`、`open`、`oval`/`dot`、`diamond`、`classic`/`block` 等）；箭头 **marker 颜色与 `strokeColor` 一致**；未设 `startArrow` 时起点无箭头；**`fontSize` / `fontColor` / `fontStyle` / `fontFamily`** 作用于边标签（与顶点相同语义）。
- **`spacing`**：仅当边 **没有** 显式 `sourcePoint`/`targetPoint`（解析回退为 **源/目标中心连线**）时生效：沿连线穿出 **轴对齐包围盒**（`ellipse` 为真实椭圆周界；**旋转**或非矩形复杂形状暂用外接矩形近似）后，两端再各内收 `spacing` 像素，避免线段画进节点内部。
- **边标签锚点**：默认路径**总长中点**；**`mxPoint as="label"`** 且 **`x` 在 [0,1]** 时为弧长比例与法向 **`y`** 偏移；**`relative=1`** 且 geometry 带 **`x`/`y`** 时为相对中点的平移。
- **边标签折行**：**`whiteSpace=wrap`** 时，以 **`mxGeometry` 的 `width`（>0）** 为最大行宽（Pretext）；无 `width` 时使用与字号相关的默认行宽。
- **边标签衬底**：**`labelBackgroundColor`**（与顶点相同：Pretext 测宽测高后圆角矩形；有衬底时不再加白色描边晕圈）。

### 标签与文本

- **`value`** 中常见 **HTML** 经 **`mxLabelToPlainText`** **降级为纯文本**（行内空白折叠）。
- **显式多行**：`</p>`、`</div>`、`</tr>`、`<br>`、源码换行等 → 多行 **`tspan`**，在形状内大致垂直居中。
- **顶点 `whiteSpace=wrap`**：框内软折行；测量与 SVG 使用同一 **`fontFamily`**（未设时为 **`Arial, Helvetica, sans-serif`**）及 **`fontStyle`** 位标志（**`1`** 粗体、**`2`** 斜体、**`4`** 下划线，可相加，与 mxGraph 一致）。

## 局限与路线图

### 已知局限

- 顶点与边均支持 **`labelBackgroundColor`**；**`fontStyle` / `fontFamily`** 已映射到 SVG 与 Pretext 测量，与编辑器像素级一致仍受系统字体与度量差异影响。
- 标签为 **纯文本**，无 HTML 内联粗体/着色等富文本。
- **`jumpStyle`** 目前仅 **`arc`**。
- **泳道、表格、`UserObject`、嵌入图片单元、大量内置 stencil** 等未覆盖或未完整建模。

### 进度概览

单页/多页与压缩、顶点与边几何、多种边路由、箭头配色、边标签锚点与折行、常用形状与渐变/虚线/旋转等已具备，**足以覆盖大量流程图与简单架构图**。若要逼近 draw.io 全量文档，中长期缺口主要在 **泳道 / 表格 / 富文本 / stencil 生态**，而非基础折线与形状。

### 工程量分档（便于排期，非承诺）

| 档位 | 含义 | 示例 |
|------|------|------|
| 小 | 现有管线内增量，常可单 PR | 更多箭头视觉变体；**`spacing` 与复杂形状周界**精细化 |
| 中 | 多处联动或新抽象 | 其它 `jumpStyle`；更多 `shape`；分组与绘制顺序；可配置字体栈 |
| 大 | 子项目级 | 泳道；表格；HTML/`foreignObject`；`image`；大范围 stencil |

### 分阶段计划

- **近期（高性价比）**：边标签与路径的 **边距** 更贴齐编辑器；**`RenderOptions`** 默认字体栈（可选）；**旋转/多边形** 上的 `spacing` 周界。
- **中期**：扩展 **`jumpStyle`**、**`shape`** 与箭头；**`parent`** 层级与遮挡；**垂直度量**与多行基线。
- **长期**：泳道、表格、`UserObject`；富文本与图片单元；**`RenderOptions`** 主题与字体栈。

若业务只关心某一类图（如 BPMN 或含表格），建议把该类需求提到近期并**收窄 stencil 范围**，避免一次性做满全库。
