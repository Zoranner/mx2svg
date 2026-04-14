/**
 * Pretext 依赖 `OffscreenCanvas` 或 DOM canvas；Bun/Node 下由 `@napi-rs/canvas` 提供 2D `measureText`。
 * 须在首次 `import '@chenglou/pretext'` 之前执行（由 `wrap-label.ts` 侧载）。
 */
import { createCanvas } from "@napi-rs/canvas";

type NapiCanvas = ReturnType<typeof createCanvas>;

if (typeof globalThis.OffscreenCanvas === "undefined") {
  globalThis.OffscreenCanvas = class OffscreenCanvasPolyfill {
    readonly #canvas: NapiCanvas;

    constructor(width: number, height: number) {
      this.#canvas = createCanvas(width, height);
    }

    get width(): number {
      return this.#canvas.width;
    }

    get height(): number {
      return this.#canvas.height;
    }

    getContext(contextId: string): CanvasRenderingContext2D | null {
      if (contextId !== "2d") return null;
      return this.#canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    }
  } as unknown as typeof OffscreenCanvas;
}
