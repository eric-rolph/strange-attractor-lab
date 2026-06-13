import { describe, expect, it } from "vitest";
import { colorizeDensity, normalizeDensity } from "./density";

describe("normalizeDensity", () => {
  it("uses logarithmic normalization across the peak density", () => {
    expect(normalizeDensity(0, 100)).toBe(0);
    expect(normalizeDensity(100, 100)).toBe(1);
    expect(normalizeDensity(10, 100)).toBeCloseTo(Math.log1p(10) / Math.log1p(100));
  });
});

describe("colorizeDensity", () => {
  it("maps empty cells to the dark field color", () => {
    expect(colorizeDensity(0)).toEqual([5, 4, 3, 255]);
  });

  it("maps peak cells to the glowing highlight color", () => {
    expect(colorizeDensity(1)).toEqual([255, 242, 199, 255]);
  });
});

