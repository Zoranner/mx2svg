/** `a=b;c=d` → Map；忽略空段。 */
export function parseMxStyle(styleAttr: string | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (!styleAttr || typeof styleAttr !== "string") {
    return m;
  }
  for (const part of styleAttr.split(";")) {
    const p = part.trim();
    if (!p) continue;
    const eq = p.indexOf("=");
    if (eq === -1) {
      m.set(p.toLowerCase(), "1");
    } else {
      const k = p.slice(0, eq).trim().toLowerCase();
      const v = p.slice(eq + 1).trim();
      if (k) m.set(k, v);
    }
  }
  return m;
}

export function inferShape(style: Map<string, string>): "rect" | "ellipse" {
  const s = style.get("shape")?.toLowerCase();
  if (s === "ellipse" || s === "circle") {
    return "ellipse";
  }
  /** draw.io 常写 `ellipse;fillColor=...`（无 shape=） */
  if (style.has("ellipse")) {
    return "ellipse";
  }
  return "rect";
}
