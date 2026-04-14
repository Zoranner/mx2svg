/** fast-xml-parser 带 `@_` 前缀的属性读写 */

export function asArray<T>(x: T | T[] | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

export function numAttr(obj: Record<string, unknown>, key: string, fallback: number): number {
  const raw = obj[`@_${key}`];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function strAttr(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[`@_${key}`];
  return v == null ? undefined : String(v);
}
