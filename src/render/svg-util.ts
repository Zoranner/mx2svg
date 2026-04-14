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
  const d = style.get("dashed");
  if (d === "1" || d === "true") return ' stroke-dasharray="6 4"';
  if (style.has("dashed") && (d === undefined || d === "")) return ' stroke-dasharray="6 4"';
  return "";
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
