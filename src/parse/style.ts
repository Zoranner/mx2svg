import type { NodeShape } from "../core/model.ts";

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

export function inferShape(style: Map<string, string>): NodeShape {
  const s = style.get("shape")?.toLowerCase();

  /** draw.io 常见 `ellipse;shape=cloud`：`shape=` 优先于裸 `ellipse` 键。 */
  if (s === "cloud") {
    return "cloud";
  }
  /** `ellipse;shape=offPageConnector`：须在裸 `ellipse` 键之前判定。 */
  if (s === "offpageconnector") {
    return "ellipse";
  }

  if (style.has("ellipse")) {
    return "ellipse";
  }
  if (s === "ellipse" || s === "circle") {
    return "ellipse";
  }

  if (s === "rhombus" || s === "diamond" || style.has("rhombus") || style.has("diamond")) {
    return "rhombus";
  }
  if (s === "hexagon" || style.has("hexagon")) {
    return "hexagon";
  }
  if (s === "parallelogram" || style.has("parallelogram")) {
    return "parallelogram";
  }
  if (
    s === "cylinder" ||
    s === "cylinder2" ||
    s === "cylinder3" ||
    style.has("cylinder") ||
    style.has("cylinder2") ||
    style.has("cylinder3")
  ) {
    return "cylinder";
  }
  if (s === "triangle" || style.has("triangle")) {
    return "triangle";
  }
  if (s === "trapezoid" || style.has("trapezoid")) {
    return "trapezoid";
  }
  if (style.has("cloud")) {
    return "cloud";
  }
  if (s === "document" || style.has("document")) {
    return "document";
  }
  if (s === "pentagon" || style.has("pentagon")) {
    return "pentagon";
  }
  if (s === "datastorage" || style.has("datastorage")) {
    return "dataStorage";
  }
  if (s === "internalstorage" || style.has("internalstorage")) {
    return "internalStorage";
  }
  if (s === "process" || style.has("process")) {
    return "process";
  }
  if (s === "delay" || style.has("delay")) {
    return "delay";
  }

  return "rect";
}
