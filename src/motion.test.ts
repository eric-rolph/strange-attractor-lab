import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "./attractor";
import {
  JOURNEY_PRESETS,
  buildDelayEmbedding,
  easeInOutCubic,
  interpolateParams,
  wrapJourneyIndex,
} from "./motion";

describe("easeInOutCubic", () => {
  it("preserves the timeline endpoints and midpoint", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("clamps values outside the timeline", () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });
});

describe("interpolateParams", () => {
  it("interpolates every coefficient without mutating either endpoint", () => {
    const from = { a: 1, b: 2, c: 3, d: 4 };
    const to = { a: 2, b: 4, c: 6, d: 8 };

    expect(interpolateParams(from, to, 0.25)).toEqual({
      a: 1.25,
      b: 2.5,
      c: 3.75,
      d: 5,
    });
    expect(from).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    expect(to).toEqual({ a: 2, b: 4, c: 6, d: 8 });
  });
});

describe("buildDelayEmbedding", () => {
  it("returns one xyz triplet per requested sample", () => {
    const points = buildDelayEmbedding(DEFAULT_PARAMS, {
      burnIn: 100,
      lag: 7,
      samples: 250,
    });

    expect(points).toHaveLength(750);
  });

  it("uses the lagged x coordinate as z and keeps all output finite", () => {
    const points = buildDelayEmbedding(DEFAULT_PARAMS, {
      burnIn: 0,
      lag: 2,
      samples: 3,
    });

    expect(points[2]).toBeCloseTo(-1);
    expect(points[5]).toBeCloseTo(-1.028944, 5);
    expect(Array.from(points).every(Number.isFinite)).toBe(true);
  });
});

describe("journey presets", () => {
  it("contains distinct curated forms and wraps indices", () => {
    expect(JOURNEY_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(JOURNEY_PRESETS.map((preset) => preset.name)).size).toBe(
      JOURNEY_PRESETS.length,
    );
    expect(wrapJourneyIndex(-1)).toBe(JOURNEY_PRESETS.length - 1);
    expect(wrapJourneyIndex(JOURNEY_PRESETS.length)).toBe(0);
  });
});
