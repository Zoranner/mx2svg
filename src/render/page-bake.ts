/**
 * 将 mxGraph 绝对坐标烘焙为贴近原点的 SVG 用户坐标（与 draw.io 导出一致，无外层 translate）。
 * `ox = minX - padding`，输出坐标 = 模型坐标 − `ox`（y 同理）。
 */
export interface PageBakeOrigin {
  readonly ox: number;
  readonly oy: number;
}

export function pageBakeOriginFromBounds(minX: number, minY: number, pad: number): PageBakeOrigin {
  return { ox: minX - pad, oy: minY - pad };
}

export function bakeX(o: PageBakeOrigin, x: number): number {
  return x - o.ox;
}

export function bakeY(o: PageBakeOrigin, y: number): number {
  return y - o.oy;
}

/**
 * 将 SVG path `d` 中所有**绝对**坐标点平移 `(-ox, -oy)`。
 * 支持本库生成的命令：`M` `L` `H` `V` `C` `Q` `A` `Z`（大小写视为相对/绝对，相对命令不偏移数值）。
 */
export function shiftPathD(d: string, ox: number, oy: number): string {
  let i = 0;
  const len = d.length;
  const parts: string[] = [];

  const skipWs = (): void => {
    while (i < len && /\s/.test(d[i]!)) i++;
  };

  const readNumber = (): number => {
    skipWs();
    const start = i;
    if (i < len && (d[i] === "-" || d[i] === "+")) i++;
    while (i < len && /\d/.test(d[i]!)) i++;
    if (i < len && d[i] === ".") {
      i++;
      while (i < len && /\d/.test(d[i]!)) i++;
    }
    if (i < len && (d[i] === "e" || d[i] === "E")) {
      i++;
      if (i < len && (d[i] === "-" || d[i] === "+")) i++;
      while (i < len && /\d/.test(d[i]!)) i++;
    }
    return Number(d.slice(start, i));
  };

  const pushCmd = (cmd: string): void => {
    const last = parts[parts.length - 1];
    if (last && /[\d.]/.test(last[last.length - 1]!)) parts.push(" ");
    parts.push(cmd);
  };

  while (i < len) {
    skipWs();
    if (i >= len) break;
    const cmd = d[i]!;
    i++;
    const upper = cmd.toUpperCase();
    const abs = cmd === upper;

    pushCmd(cmd);

    if (upper === "Z") continue;

    const emitPair = (x: number, y: number): void => {
      if (abs) {
        parts.push(` ${x - ox} ${y - oy}`);
      } else {
        parts.push(` ${x} ${y}`);
      }
    };

    const emit1 = (v: number, shift: number): void => {
      parts.push(` ${abs ? v - shift : v}`);
    };

    switch (upper) {
      case "M": {
        emitPair(readNumber(), readNumber());
        while (i < len) {
          skipWs();
          if (i >= len) break;
          const c = d[i]!;
          if (/[a-zA-Z]/.test(c)) break;
          emitPair(readNumber(), readNumber());
        }
        break;
      }
      case "L":
      case "T": {
        emitPair(readNumber(), readNumber());
        break;
      }
      case "H": {
        emit1(readNumber(), ox);
        break;
      }
      case "V": {
        emit1(readNumber(), oy);
        break;
      }
      case "C": {
        for (let k = 0; k < 3; k++) {
          emitPair(readNumber(), readNumber());
        }
        break;
      }
      case "S":
      case "Q": {
        for (let k = 0; k < 2; k++) {
          emitPair(readNumber(), readNumber());
        }
        break;
      }
      case "A": {
        const rx = readNumber();
        const ry = readNumber();
        const rot = readNumber();
        const fa = readNumber();
        const fs = readNumber();
        const x = readNumber();
        const y = readNumber();
        parts.push(` ${rx} ${ry} ${rot} ${fa} ${fs} ${abs ? x - ox : x} ${abs ? y - oy : y}`);
        break;
      }
      default:
        throw new Error(`mx2svg: shiftPathD unsupported command "${cmd}" in path`);
    }
  }

  return parts.join("");
}
