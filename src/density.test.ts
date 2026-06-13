import { describe, expect, it } from "vitest";
import {
  colorizeDensity,
  colorizeField,
  normalizeDensity,
  normalizeSignal,
} from "./density";

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

describe("normalizeSignal", () => {
  it("normalizes speed across the useful De Jong step range", () => {
    expect(normalizeSignal("speed", 0)).toBe(0);
    expect(normalizeSignal("speed", 1.5)).toBe(0.5);
    expect(normalizeSignal("speed", 4)).toBe(1);
  });

  it("maps signed curvature around a neutral midpoint", () => {
    expect(normalizeSignal("curvature", -Math.PI)).toBe(0);
    expect(normalizeSignal("curvature", 0)).toBe(0.5);
    expect(normalizeSignal("curvature", Math.PI)).toBe(1);
  });

  it("wraps cyclic trajectory direction", () => {
    expect(normalizeSignal("direction", Math.PI / 2)).toBe(0.25);
    expect(normalizeSignal("direction", -Math.PI / 2)).toBe(0.75);
  });
});

describe("colorizeField", () => {
  it("keeps empty cells at the common dark field color", () => {
    expect(colorizeField(0, 0.75, "speed")).toEqual([5, 4, 3, 255]);
    expect(colorizeField(0, 0.25, "curvature")).toEqual([5, 4, 3, 255]);
  });

  it("uses density to increase lightness in every secondary encoding", () => {
    const rare = colorizeField(0.2, 0.8, "speed");
    const dense = colorizeField(1, 0.8, "speed");
    const luminance = (color: number[]) => color[0] + color[1] + color[2];

    expect(luminance(dense)).toBeGreaterThan(luminance(rare));
  });

  it("uses the selected signal to change hue", () => {
    expect(colorizeField(1, 0, "speed")).not.toEqual(
      colorizeField(1, 1, "speed"),
    );
    expect(colorizeField(1, 0, "curvature")).not.toEqual(
      colorizeField(1, 1, "curvature"),
    );
    expect(colorizeField(1, 0, "direction")).not.toEqual(
      colorizeField(1, 0.5, "direction"),
    );
  });

  it("retains the original sequential density palette", () => {
    expect(colorizeField(0.5, 0, "density")).toEqual(colorizeDensity(0.5));
  });
});
