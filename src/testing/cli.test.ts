import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { minimalMxfile as sampleXml } from "./test-fixtures.ts";
import { writeTestOutputSvg } from "./test-svg-dump.ts";

const pkgRoot = join(import.meta.dir, "..", "..");

describe("cli", () => {
  test("--string prints SVG to stdout when no -o", () => {
    const r = Bun.spawnSync({
      cmd: ["bun", "run", join(import.meta.dir, "..", "cli.ts"), "-s", sampleXml],
      cwd: pkgRoot,
    });
    expect(r.success).toBe(true);
    const err = new TextDecoder().decode(r.stderr);
    expect(err).not.toContain("已写入");
    const svg = new TextDecoder().decode(r.stdout);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Hello");

    writeTestOutputSvg("cli", "string-stdout", svg);
  });

  test("--string -o writes file", () => {
    const out = join(pkgRoot, ".test-output", "cli", "string-o.svg");
    const r = Bun.spawnSync({
      cmd: ["bun", "run", join(import.meta.dir, "..", "cli.ts"), "-s", sampleXml, "-o", out],
      cwd: pkgRoot,
    });
    expect(r.success).toBe(true);
    expect(readFileSync(out, "utf8")).toContain("<svg");
  });

  test("--font-stack is passed to convert", () => {
    const r = Bun.spawnSync({
      cmd: [
        "bun",
        "run",
        join(import.meta.dir, "..", "cli.ts"),
        "-s",
        sampleXml,
        "--font-stack",
        "Georgia, serif",
      ],
      cwd: pkgRoot,
    });
    expect(r.success).toBe(true);
    const svg = new TextDecoder().decode(r.stdout);
    expect(svg).toContain("Georgia");
    expect(svg).toContain("Hello");
    writeTestOutputSvg("cli", "font-stack-stdout", svg);
  });

  test("--vertex-font-size is passed to convert", () => {
    const r = Bun.spawnSync({
      cmd: [
        "bun",
        "run",
        join(import.meta.dir, "..", "cli.ts"),
        "-s",
        sampleXml,
        "--vertex-font-size",
        "23",
      ],
      cwd: pkgRoot,
    });
    expect(r.success).toBe(true);
    const hello =
      new TextDecoder().decode(r.stdout).match(/<g data-mx2svg-id="2"[\s\S]*?<\/g>/)?.[0] ?? "";
    expect(hello).toContain('font-size="23"');
  });
});
