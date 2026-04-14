import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pkgRoot = join(import.meta.dir, "..", "..");

/**
 * 写入 `mx2svg/.test-output/{subdir}/{name}.svg`（仅本地目视；目录已 .gitignore）。
 * `name` 不要带 `.svg`；非法字符会替换为 `_`。
 */
export function writeTestOutputSvg(subdir: string, name: string, svg: string): void {
  const base = name.replace(/\.svg$/i, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const rel = subdir
    .trim()
    .replace(/^[/\\]+|[/\\]+$/g, "")
    .replace(/[^a-zA-Z0-9._/-\\]+/g, "_");
  const dir = rel ? join(pkgRoot, ".test-output", rel) : join(pkgRoot, ".test-output");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${base}.svg`), svg, "utf8");
}
