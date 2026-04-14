/** XML / SVG 属性转义 */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function colorOr(style: Map<string, string>, key: string, fallback: string): string {
  const v = style.get(key);
  if (!v || v === "none") return fallback;
  return v;
}

/**
 * 形状/描边用颜色：键**存在**且为 **`none`** 时保留 **`none`**；键缺失时用 **`fallback`**。
 * （`colorOr` 会把 **`none`** 当成“未设置”而退回默认，不适合填充/描边关闭。）
 */
export function mxPaintColor(style: Map<string, string>, key: string, fallback: string): string {
  if (!style.has(key)) return fallback;
  const v = style.get(key);
  if (v == null || v === "") return fallback;
  if (v.toLowerCase() === "none") return "none";
  return v;
}

/** `strokeWidth`：未设默认 **`defaultWidth`**；非法则回退；**`0`** 保留（表示无描边）。 */
export function strokeWidthPx(style: Map<string, string>, defaultWidth: number): number {
  const raw = style.get("strokewidth");
  if (raw == null || raw === "") return defaultWidth;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return defaultWidth;
  return n;
}

const DROP_SHADOW_FILTER_ID = "mx2svg-drop-shadow";

/** draw.io **`shadow=1`**：整图元投影（近似）。 */
export function mxStyleShadowEnabled(style: Map<string, string>): boolean {
  const v = style.get("shadow");
  return v === "1" || v === "true";
}

export function dropShadowFilterId(): string {
  return DROP_SHADOW_FILTER_ID;
}

/** 放入 `<defs>` 一次即可；与 **`filter="url(#…)"`** 配对。 */
export function dropShadowFilterDefXml(): string {
  return `<filter id="${DROP_SHADOW_FILTER_ID}" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur"/>
  <feOffset in="blur" dx="2" dy="3" result="offsetBlur"/>
  <feMerge>
    <feMergeNode in="offsetBlur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`;
}

export function mxStyleFlipH(style: Map<string, string>): boolean {
  const v = style.get("fliph");
  return v === "1" || v === "true";
}

export function mxStyleFlipV(style: Map<string, string>): boolean {
  const v = style.get("flipv");
  return v === "1" || v === "true";
}

/** draw.io `gradientDirection` → SVG objectBoundingBox 线性渐变向量 */
export function gradientDirectionToPercents(dirRaw: string): {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
} {
  const d = (dirRaw || "south").toLowerCase().replace(/\s+/g, "");
  switch (d) {
    case "north":
      return { x1: "0%", y1: "100%", x2: "0%", y2: "0%" };
    case "south":
      return { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
    case "east":
      return { x1: "0%", y1: "0%", x2: "100%", y2: "0%" };
    case "west":
      return { x1: "100%", y1: "0%", x2: "0%", y2: "0%" };
    case "northeast":
      return { x1: "0%", y1: "100%", x2: "100%", y2: "0%" };
    case "northwest":
      return { x1: "100%", y1: "100%", x2: "0%", y2: "0%" };
    case "southeast":
      return { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };
    case "southwest":
      return { x1: "100%", y1: "0%", x2: "0%", y2: "100%" };
    default:
      return { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
  }
}

export function strokeDashAttr(style: Map<string, string>): string {
  const patRaw = style.get("dashpattern");
  if (patRaw != null && patRaw.trim() !== "") {
    const parts = patRaw
      .split(/[\s,]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parts.length > 0) {
      return ` stroke-dasharray="${parts.join(" ")}"`;
    }
  }
  const d = style.get("dashed");
  if (d === "1" || d === "true") return ' stroke-dasharray="6 4"';
  if (style.has("dashed") && (d === undefined || d === "")) return ' stroke-dasharray="6 4"';
  const dash = style.get("dash");
  if (dash === "1" || dash === "true") return ' stroke-dasharray="6 4"';
  return "";
}

/**
 * draw.io 透明度字面量（**`opacity` / `fillOpacity` / `strokeOpacity`** 等，解析后键均为小写）：
 * 无小数点按 **0–100**；含小数点按 **0–1**。
 * 返回 **`[0,1]`**；未设/无效/**全不透明**（`≥1`）返回 **`null`**，便于省略 SVG属性。
 */
export function styleOpacityFactor01(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const trimmed = raw.trim();
  const v = Number(trimmed);
  if (!Number.isFinite(v)) return null;
  const u = trimmed.includes(".") ? Math.max(0, Math.min(1, v)) : Math.max(0, Math.min(1, v / 100));
  if (u >= 1 - 1e-9) return null;
  return u;
}

/** 标签文字 **`fontOpacity`**（键 **`fontopacity`**），规则同 **`styleOpacityFactor01`**。 */
export function textFillOpacityAttr(style: Map<string, string>): string {
  const u = styleOpacityFactor01(style.get("fontopacity"));
  if (u == null) return "";
  return ` fill-opacity="${u}"`;
}

/** 整组乘性透明度，作用于顶点/边根 `<g>`（含标签）。 */
export function groupOpacityAttr(style: Map<string, string>): string {
  const u = styleOpacityFactor01(style.get("opacity"));
  if (u == null) return "";
  return ` opacity="${u}"`;
}

/** 仅填充；与根 `opacity` 相乘。 */
export function fillOpacityAttr(style: Map<string, string>): string {
  const u = styleOpacityFactor01(style.get("fillopacity"));
  if (u == null) return "";
  return ` fill-opacity="${u}"`;
}

/** 仅描边；与根 `opacity` 相乘。 */
export function strokeOpacityAttr(style: Map<string, string>): string {
  const u = styleOpacityFactor01(style.get("strokeopacity"));
  if (u == null) return "";
  return ` stroke-opacity="${u}"`;
}

/** mxGraph **`linecap`**（键 **`linecap`**）→ SVG：`flat` → `butt`。无效时返回 **`null`**。 */
export function svgLinecapFromMxStyle(style: Map<string, string>): string | null {
  const raw = style.get("linecap");
  if (raw == null || raw === "") return null;
  const t = raw.toLowerCase().trim();
  if (t === "flat") return "butt";
  if (t === "square" || t === "round") return t;
  return null;
}

/** mxGraph **`linejoin`**（键 **`linejoin`**）→ SVG：`miter` | `round` | `bevel`。无效时返回 **`null`**。 */
export function svgLinejoinFromMxStyle(style: Map<string, string>): string | null {
  const raw = style.get("linejoin");
  if (raw == null || raw === "") return null;
  const t = raw.toLowerCase().trim();
  if (t === "miter" || t === "round" || t === "bevel") return t;
  return null;
}

/**
 * 边 **`path` / `polyline`**：未设时与当前默认一致（**`round` / `round`**），与 draw.io 常见连接器一致。
 */
export function edgeStrokeCapJoinAttr(style: Map<string, string>): string {
  const cap = svgLinecapFromMxStyle(style) ?? "round";
  const join = svgLinejoinFromMxStyle(style) ?? "round";
  return ` stroke-linecap="${cap}" stroke-linejoin="${join}"`;
}

/** 顶点 **`path`**：默认 **`linejoin=round`**（与形状折角一致）；`linecap` 仅在有样式时输出。 */
export function vertexPathStrokeCapJoinAttr(style: Map<string, string>): string {
  const join = svgLinejoinFromMxStyle(style) ?? "round";
  const cap = svgLinecapFromMxStyle(style);
  const capAttr = cap != null ? ` stroke-linecap="${cap}"` : "";
  return ` stroke-linejoin="${join}"${capAttr}`;
}

/**
 * 顶点 **`rect` / `ellipse` / `line`**：无默认；仅当 style 中设置了 **`linecap`**或 **`linejoin`** 时追加。
 */
export function vertexOptionalStrokeCapJoinAttr(style: Map<string, string>): string {
  const cap = svgLinecapFromMxStyle(style);
  const join = svgLinejoinFromMxStyle(style);
  let s = "";
  if (cap != null) s += ` stroke-linecap="${cap}"`;
  if (join != null) s += ` stroke-linejoin="${join}"`;
  return s;
}

/** 与 `vertexOptionalStrokeCapJoinAttr` 相同，用于 **`line`**（无 `linejoin` 时忽略）。 */
export function vertexLineStrokeCapAttr(style: Map<string, string>, defaultCap: string): string {
  const cap = svgLinecapFromMxStyle(style) ?? defaultCap;
  return ` stroke-linecap="${cap}"`;
}

/**
 * **`strokeMiterlimit`** / **`miterLimit`**（键 **`strokemiterlimit`** 或 **`miterlimit`**），在 **`linejoin=miter`** 时影响尖角；设了即输出。
 */
export function strokeMiterlimitAttr(style: Map<string, string>): string {
  const raw = style.get("strokemiterlimit") ?? style.get("miterlimit");
  if (raw == null || raw === "") return "";
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0) return "";
  return ` stroke-miterlimit="${v}"`;
}

/** **`labelBorderColor`** / **`labelBorderWidth`**（键 **`labelbordercolor`**、**`labelborderwidth`**），用于标签衬底矩形描边。 */
export function labelBackgroundStrokeAttrs(style: Map<string, string>): string {
  const bc = style.get("labelbordercolor");
  if (!bc || bc === "none") return "";
  const bwRaw = style.get("labelborderwidth");
  let bw = 1;
  if (bwRaw != null && bwRaw !== "") {
    const n = Number(bwRaw);
    if (Number.isFinite(n) && n > 0) bw = n;
  }
  return ` stroke="${esc(bc)}" stroke-width="${bw}"`;
}

/** draw.io **`double=1`**：双线框（矩形/椭圆）。 */
export function mxStyleDoubleEnabled(style: Map<string, string>): boolean {
  const v = style.get("double");
  return v === "1" || v === "true";
}

/** 矩形圆角：`rounded=1` 为比例圆角；`rounded=N` 为像素半径；`rounded=0` 关闭。 */
export function rectCornerRadius(style: Map<string, string>, w: number, h: number): number {
  const r = style.get("rounded");
  if (r === "0" || r === "false") return 0;

  if (r && r !== "1" && r !== "true") {
    const n = Number(r);
    if (Number.isFinite(n)) {
      if (n <= 0) return 0;
      return Math.min(n, Math.min(w, h) / 2);
    }
  }

  const useDefaultRound =
    r === "1" || r === "true" || (style.has("rounded") && (r === undefined || r === ""));
  if (!useDefaultRound) {
    const arc = style.get("arcsize");
    if (arc) {
      const pct = Number(arc);
      if (Number.isFinite(pct) && pct > 0) {
        return Math.min((Math.min(w, h) * pct) / 100, Math.min(w, h) / 2);
      }
    }
    return 0;
  }

  return Math.min(12, Math.min(w, h) / 4);
}

export interface GradientBuildContext {
  fragments: string[];
  nextId: number;
}

export function allocFill(
  style: Map<string, string>,
  baseFill: string,
  g: GradientBuildContext,
): string {
  if (baseFill === "none") {
    return "none";
  }
  const g2 = colorOr(style, "gradientcolor", "");
  if (!g2 || g2 === "none") {
    return esc(baseFill);
  }
  const dir = style.get("gradientdirection") ?? "south";
  const { x1, y1, x2, y2 } = gradientDirectionToPercents(dir);
  const id = `mx2svg-g-${g.nextId++}`;
  g.fragments.push(
    `<linearGradient id="${id}" gradientUnits="objectBoundingBox" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="${esc(baseFill)}"/>
      <stop offset="100%" stop-color="${esc(g2)}"/>
    </linearGradient>`,
  );
  return `url(#${id})`;
}

export function bumpRotatedRect(
  bump: (x: number, y: number) => void,
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg: number,
): void {
  if (!rotationDeg) {
    bump(x, y);
    bump(x + w, y + h);
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  for (const [px, py] of corners) {
    const dx = px - cx;
    const dy = py - cy;
    bump(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
  }
}
