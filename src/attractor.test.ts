import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, iteratePoint, stepAttractor } from "./attractor";

describe("stepAttractor", () => {
  it("applies the supplied equations to the origin", () => {
    expect(stepAttractor({ x: 0, y: 0 }, DEFAULT_PARAMS)).toEqual({
      x: -1,
      y: -1,
    });
  });

  it("matches the second supplied-equation iteration", () => {
    const result = stepAttractor({ x: -1, y: -1 }, DEFAULT_PARAMS);

    expect(result.x).toBeCloseTo(-1.028944, 5);
    expect(result.y).toBeCloseTo(-0.799619, 5);
  });
});

describe("iteratePoint", () => {
  it("keeps the supplied attractor finite and bounded over a long run", () => {
    let point = { x: 0, y: 0 };

    for (let index = 0; index < 100_000; index += 1) {
      point = iteratePoint(point, DEFAULT_PARAMS);
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(Math.abs(point.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(2);
    }
  });
});
