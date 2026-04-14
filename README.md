# mx2svg

将 **draw.io / diagrams.net**（`mxfile` / `mxGraphModel`）XML 转为 **SVG**。**MIT** 许可。

## 快速开始

```bash
bun install
bun test
```

跑完测试会在 **`mx2svg/.test-output/`** 生成示例 SVG（**已 `.gitignore`**）：**`cli/`** 来自 CLI 单测，**`convert/`** 来自 **`src/testing/convert-output.test.ts`**（多组典型图，便于目视对照）。

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

| 路径 | 职责 |
|------|------|
| **`index.ts`** | 对外导出 `convert`、`parseDrawioXml`、`renderToSvg`、`decompressDiagramInner` 与 IR 类型 |
| **`convert.ts`** | `parseDrawioXml` → `renderToSvg` |
| **`parse.ts`** / **`parse/`** | 顶层 XML、多页、压缩 payload、样式、几何、边端点与 **`spacing`** |
| **`render/`** | `render-to-svg`、顶点/边、标签、SVG 工具与选项 |
| **`edge/`** | 箭头、曲线/圆角/跳线、折线工具 |
| **`shape/`** | 顶点 `path` 与周界（与边端点 **`spacing`** 求交） |
| **`text/`** | 字体、折行、纯文本标签、Canvas 度量垫片 |
| **`testing/`** | 集成与 CLI 单测、fixtures、SVG 导出 |

## 依赖

| 包 | 作用 |
|----|------|
| `fast-xml-parser` | 无 DOM 的 XML 解析（Node / Bun） |
| `pako` | diagram 内 **base64 + raw deflate**（与 draw.io 一致） |
| `@chenglou/pretext` | **`whiteSpace=wrap`** 时折行与测宽 |
| `@napi-rs/canvas` | 非浏览器环境下的 Canvas 2D / **`OffscreenCanvas`** 垫片（`src/text/pretext-shim.ts`） |

## 功能参考（速查）

更细的样式键名、数值规则与边角行为以 **`src/parse/style`**、**`src/render`** 与 **`src/testing`** 为准；此处只列能力边界，便于检索。

### 解析与页面

| 项 | 说明 |
|----|------|
| 多页 | `<mxfile>` 下单页或多页，`pageIndex` 选择 |
| 压缩 | diagram 内 **deflate + base64** payload，与 diagrams.net 导出一致 |

### 顶点（节选）

| 类别 | 已覆盖（示例） |
|------|----------------|
| 几何 | 位置、宽高、**`rotation`**（绕中心）、**`flipH` / `flipV`** |
| 形状 | 默认 **`rect` / `ellipse`**；**`rhombus`**、**`hexagon`**、**`parallelogram`**、**`triangle`**（方向）、**`trapezoid`** 等；**`cylinder`**、**`cloud`**、**`document`**、**`dataStorage`**、**`internalStorage`** 等 |
| 填充描边 | **`fillColor` / `strokeColor`**（含 **`none`**）、**`strokeWidth`**、**`opacity`**、**`fillOpacity` / `strokeOpacity`**、**`rounded` / `arcSize`**、**`double`**（部分形状） |
| 虚线 | **`dashed` / `dash`**、**`dashPattern`**、**`fixDash`**（是否按线宽缩放） |
| 线端样式 | **`linecap` / `linejoin`**、**`miterLimit`** |
| 渐变 | **`gradientColor` + `gradientDirection`**（`objectBoundingBox`） |
| 标签区 | **`align` / `verticalAlign`**、**`spacing*`**（标签区内边距）、**`noLabel`**、**`letterSpacing` / `lineHeight`** |
| 标签装饰 | **`labelBackgroundColor`**、**`labelBorderColor` / `labelBorderWidth`**、**`overflow=hidden` / `clip`**（**`clipPath`**） |
| 其它 | **`shadow`**、**`link`**（**`<a>`**）、**`tooltip`**（**`<title>`**）、**`fontStyle` / `fontFamily` / `fontSize` / `fontColor` / `fontOpacity`** |

### 边（节选）

| 类别 | 已覆盖（示例） |
|------|----------------|
| 几何 | `sourcePoint` → 路点 → `targetPoint`；无点则连两端中心 |
| 路由 | **`curved`**（二次贝塞尔）、**`rounded`** 正交圆角、**`jumpStyle`**（**`arc` / `line` / `sharp` / `gap`**，与 **`jumpSize`**、**`noJump`** 等配合；几何对齐 draw.io `mxConnector.paintLine`）；优先级：**跳线 > 曲线 > 圆角 > 折线** |
| 端点 **`spacing`** | 无显式端点、回退为中心连线时，沿形状周界穿出再内收；**凸多边形**与 **`cloud` / `cylinder` / `document` / `dataStorage`** 等曲线轮廓已接周界近似（旋转几何下与 **`shape-path`** 一致） |
| 箭头 | **`endArrow` / `startArrow`** 多种、`endSize` / `startSize` |
| 样式 | 与顶点类似的描边/虚线/透明度；**`noLabel`**、标签 **`align` / `verticalAlign`**、**`labelPadding`**、**`labelBackgroundColor`**、**`overflow=hidden`** 等 |

### 文本

| 项 | 说明 |
|----|------|
| 纯文本 | **`value`** 经 **`mxLabelToPlainText`** 降为纯文本；**`whiteSpace=wrap`** 用 Pretext + 与测量一致的字体栈 |
| 多行 | **`</p>` / `</div>` / `<br>` / 换行** 等 → 多 **`tspan`**；垂直居中用 Canvas **`measureText`** 对齐墨迹中心（与单行 **`dominant-baseline="middle"`** 视觉一致） |

## 能力边界

本库刻意保持 **依赖少、IR 清晰、单测友好**。相对 **draw.io / diagrams.net 里常见、但 mxGraph XML 也可能出现的**能力，当前缺口大致如下（细化排期见「路线图」）：

| 维度 | 现状 |
|------|------|
| 自定义 / stencil 形状 | 仅内置枚举；无通用 stencil 加载 |
| 标签 | 纯文本 + 折行；无 XHTML 富文本 |
| 泳道、表格 | 未覆盖 |
| 图片、`UserObject` | 未覆盖 |
| 边与周界 | 中心连线 + **`spacing`** 周界（形状集合持续补全） |

## 路线图

### 近期（增量，优先可测）

- 边标签在 **曲线 / 多行 / 极端 `align`** 组合下的位置与基线微调，补回归用例。
- **`jumpStyle`**：与编辑器差异的边角用例（多交点、缩放等）。
- **箭头**：补齐常用 **`startArrow` / `endArrow`** 变体及与线宽、marker 尺寸的一致性。
- **周界与 `spacing`**：对仍用轴对齐近似的形状做清单化排查；旋转矩形 / 椭圆边角用例加固。

### 中期（跨模块）

- **`parent` 层级与绘制顺序**（分组、遮挡关系与 draw.io 更一致）。
- 更多内置 **`shape`**（按业务优先级列清单，避免一次性对齐全库 stencil）。
- **`RenderOptions`**：主题色 / 默认字号栈等（不破坏现有 API）。

### 长期（子项目级）

- **富文本**：XHTML 子集或 **`foreignObject`**（需安全与一致性策略）。
- **`image` / `UserObject`** 与嵌入资源策略。
- **泳道、表格** 的可渲染子集。
- **Stencil**：受控加载（限定 group / 缓存），或「导出时展开为 path」的离线方案。

若业务只关心某一类图，建议**先收窄形状与样式集合**再排期，避免与 draw.io 全量文档一次性对标。

## 已知局限

- 系统字体与编辑器 **像素级一致** 不保证；已用 Canvas 尽量对齐测宽测高。
- 标签无 HTML 富文本；复杂样式以 draw.io 为准时需降低预期或自行扩展渲染。
- **`jumpStyle`** 已支持 **`arc` / `line` / `sharp` / `gap`**；极端图元密度下与编辑器仍可能有视觉差。
