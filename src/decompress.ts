import { inflate } from "pako";

/**
 * diagram 子节点为压缩 payload 时：base64 → raw deflate → UTF-8 → decodeURIComponent。
 * 参考 draw.io 存储格式；失败则原样返回（当作已是 XML）。
 */
export function decompressDiagramInner(payload: string): string {
  const t = payload.trim();
  if (!t || t.startsWith("<")) {
    return payload;
  }
  try {
    const binary = atob(t);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const inflated = inflate(bytes, { raw: true });
    return decodeURIComponent(new TextDecoder("utf-8").decode(inflated));
  } catch {
    return payload;
  }
}
