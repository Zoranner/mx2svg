import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { minimalMxfile as sampleXml } from "./test-fixtures.ts";

describe("cli", () => {
  test("--string prints SVG to stdout when no -o", () => {
    const r = Bun.spawnSync({
      cmd: ["bun", "run", join(import.meta.dir, "cli.ts"), "-s", sampleXml],
      cwd: join(import.meta.dir, ".."),
    });
    expect(r.success).toBe(true);
    const err = new TextDecoder().decode(r.stderr);
    expect(err).not.toContain("已写入");
    const svg = new TextDecoder().decode(r.stdout);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Hello");
  });

  test("--string -o writes file", () => {
    const dir = mkdtempSync(join(tmpdir(), "mx2svg-cli-"));
    const out = join(dir, "t.svg");
    const r = Bun.spawnSync({
      cmd: ["bun", "run", join(import.meta.dir, "cli.ts"), "-s", sampleXml, "-o", out],
      cwd: join(import.meta.dir, ".."),
    });
    expect(r.success).toBe(true);
    expect(readFileSync(out, "utf8")).toContain("<svg");
    rmSync(dir, { recursive: true, force: true });
  });
});
