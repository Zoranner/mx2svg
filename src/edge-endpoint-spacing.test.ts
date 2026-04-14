import { describe, expect, test } from "bun:test";
import { adjustCenterConnectorEndpoints } from "./edge-endpoint-spacing.ts";
import type { DiagramNode } from "./model.ts";

function node(
  partial: Partial<DiagramNode> & Pick<DiagramNode, "id" | "x" | "y" | "width" | "height">,
): DiagramNode {
  return {
    parentId: "1",
    rotation: 0,
    label: "",
    shape: "rect",
    style: new Map(),
    ...partial,
  };
}

describe("adjustCenterConnectorEndpoints", () => {
  test("moves endpoints from centers toward shape exits with spacing", () => {
    const a = node({ id: "a", x: 100, y: 80, width: 120, height: 60 });
    const b = node({ id: "b", x: 300, y: 80, width: 80, height: 80 });
    const cA = { x: 160, y: 110 };
    const cB = { x: 340, y: 120 };
    const adj = adjustCenterConnectorEndpoints(cA, cB, a, b, 10);
    expect(adj).not.toBeNull();
    const [p0, p1] = adj!;
    expect(p0.x).toBeGreaterThan(210);
    expect(p1.x).toBeLessThan(340);
  });

  test("ellipse source uses ellipse perimeter", () => {
    const a = node({ id: "a", x: 100, y: 80, width: 120, height: 60, shape: "ellipse" });
    const b = node({ id: "b", x: 300, y: 80, width: 80, height: 80, shape: "rect" });
    const cA = { x: 160, y: 110 };
    const cB = { x: 340, y: 120 };
    const adj = adjustCenterConnectorEndpoints(cA, cB, a, b, 8);
    expect(adj).not.toBeNull();
    const [p0] = adj!;
    expect(p0.x).toBeGreaterThan(160);
  });

  test("rotated rect perimeter differs from rotation=0", () => {
    const b = node({ id: "b", x: 300, y: 80, width: 80, height: 80 });
    const cA = { x: 160, y: 110 };
    const cB = { x: 340, y: 120 };
    const flat = node({ id: "a", x: 100, y: 80, width: 120, height: 60, rotation: 0 });
    const tilt = node({ id: "a", x: 100, y: 80, width: 120, height: 60, rotation: 45 });
    const pFlat = adjustCenterConnectorEndpoints(cA, cB, flat, b, 10);
    const pTilt = adjustCenterConnectorEndpoints(cA, cB, tilt, b, 10);
    expect(pFlat).not.toBeNull();
    expect(pTilt).not.toBeNull();
    const d =
      Math.abs(pFlat![0].x - pTilt![0].x) + Math.abs(pFlat![0].y - pTilt![0].y);
    expect(d).toBeGreaterThan(1);
  });

  test("returns null for non-positive spacing", () => {
    const a = node({ id: "a", x: 0, y: 0, width: 10, height: 10 });
    const b = node({ id: "b", x: 100, y: 0, width: 10, height: 10 });
    expect(adjustCenterConnectorEndpoints({ x: 5, y: 5 }, { x: 105, y: 5 }, a, b, 0)).toBeNull();
    expect(adjustCenterConnectorEndpoints({ x: 5, y: 5 }, { x: 105, y: 5 }, a, b, -1)).toBeNull();
  });
});
