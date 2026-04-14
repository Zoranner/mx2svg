/**
 * 命令行：draw.io / diagrams.net XML → SVG（文件、字符串或 stdin）。
 *
 * 用法见 --help。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { convert } from "./convert.ts";

function printHelp(): void {
  console.log(`mx2svg — draw.io XML → SVG

输入（三选一）:
  <路径.xml|.drawio> 从文件读取
  -                      从标准输入读取整段 XML
  -s, --string <xml>     直接使用 XML 字符串（适合小片段测试）

输出:
来自文件时：默认写入与输入同目录、同主文件名 .svg（可用 -o 覆盖）
  来自 -s 或 stdin 时：默认写入标准输出（可用 -o 改为写文件）

用法示例:
  bun run ./src/cli.ts path/to/file.drawio
  bun run ./src/cli.ts -s '<?xml version="1.0"?><mxfile>...</mxfile>' -o out.svg
  bun run ./src/cli.ts -s '<mxfile>...</mxfile>'   # SVG 打到 stdout
  type file.drawio | bun run ./src/cli.ts -

选项:
  -o, --output <路径>   输出 SVG（覆盖默认行为）
  --page <n>            页索引，从 0 开始（默认 0）
  --padding <n>         viewBox 内边距（默认 8）
  --bg <颜色>           背景色（默认 #ffffff）
  --font-stack <栈>     无 fontFamily 的单元格使用的 font-family（同 API defaultFontStack）
  -h, --help            显示此说明
`);
}

type InputSource =
  | { kind: "file"; path: string }
  | { kind: "literal"; xml: string }
  | { kind: "stdin" };

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  let filePath: string | undefined;
  let literalXml: string | undefined;
  let output: string | undefined;
  let pageIndex = 0;
  let padding = 8;
  let backgroundColor = "#ffffff";
  let defaultFontStack: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--output") {
      output = argv[++i];
      if (!output) {
        console.error("缺少 --output 路径");
        process.exit(1);
      }
      continue;
    }
    if (a === "-s" || a === "--string") {
      const v = argv[++i];
      if (v === undefined) {
        console.error("缺少 --string 的 XML 内容");
        process.exit(1);
      }
      if (literalXml !== undefined) {
        console.error("不能多次指定 --string");
        process.exit(1);
      }
      literalXml = v;
      continue;
    }
    if (a === "--page") {
      const v = argv[++i];
      pageIndex = v ? Number(v) : NaN;
      if (!Number.isFinite(pageIndex) || pageIndex < 0) {
        console.error("--page 须为非负整数");
        process.exit(1);
      }
      continue;
    }
    if (a === "--padding") {
      const v = argv[++i];
      padding = v ? Number(v) : NaN;
      if (!Number.isFinite(padding) || padding < 0) {
        console.error("--padding 须为非负数");
        process.exit(1);
      }
      continue;
    }
    if (a === "--bg") {
      const v = argv[++i];
      if (!v) {
        console.error("缺少 --bg 颜色");
        process.exit(1);
      }
      backgroundColor = v;
      continue;
    }
    if (a === "--font-stack") {
      const v = argv[++i];
      if (!v || !v.trim()) {
        console.error("缺少 --font-stack 内容（例如: Inter, system-ui, sans-serif）");
        process.exit(1);
      }
      defaultFontStack = v;
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`未知参数: ${a}`);
      printHelp();
      process.exit(1);
    }
    if (filePath !== undefined) {
      console.error("只能指定一个文件路径（或使用 -s / -）");
      process.exit(1);
    }
    filePath = a;
  }

  let source: InputSource;
  if (literalXml !== undefined) {
    if (filePath !== undefined) {
      console.error("不能同时指定文件路径与 --string");
      process.exit(1);
    }
    source = { kind: "literal", xml: literalXml };
  } else if (filePath === "-") {
    source = { kind: "stdin" };
  } else if (filePath !== undefined) {
    source = { kind: "file", path: filePath };
  } else {
    printHelp();
    process.exit(1);
  }

  let xml: string;
  switch (source.kind) {
    case "file":
      xml = readFileSync(source.path, "utf8");
      break;
    case "literal":
      xml = source.xml;
      break;
    case "stdin":
      xml = readFileSync(0, "utf8");
      if (!xml.trim()) {
        console.error("标准输入为空");
        process.exit(1);
      }
      break;
    default: {
      const _x: never = source;
      return _x;
    }
  }

  const svg = convert(xml, {
    pageIndex,
    padding,
    backgroundColor,
    ...(defaultFontStack !== undefined ? { defaultFontStack } : {}),
  });

  let outPath = output;
  if (outPath === undefined && (source.kind === "literal" || source.kind === "stdin")) {
    process.stdout.write(svg);
    return;
  }
  if (outPath === undefined && source.kind === "file") {
    const base = basename(source.path);
    const stem = extname(base) ? base.slice(0, -extname(base).length) : base;
    outPath = join(dirname(source.path), `${stem}.svg`);
  }
  if (!outPath) {
    console.error("无法确定输出路径");
    process.exit(1);
  }

  writeFileSync(outPath, svg, "utf8");
  console.error(`已写入 ${outPath}`);
}

main();
