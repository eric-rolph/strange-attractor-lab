import type { AttractorParams, Point } from "./attractor";
import { stepAttractor } from "./attractor";

export type JourneyPreset = {
  name: string;
  params: AttractorParams;
};

export type DelayEmbeddingOptions = {
  burnIn: number;
  lag: number;
  samples: number;
};

export const JOURNEY_PRESETS: JourneyPreset[] = [
  {
    name: "Ember Vessel",
    params: { a: 1.51, b: -1.54, c: 1.36, d: -1.75 },
  },
  {
    name: "Solar Ribbon",
    params: { a: 1.6, b: -1.54, c: 1.36, d: -1.75 },
  },
  {
    name: "Cathedral Fold",
    params: { a: 2.01, b: -2.53, c: 1.61, d: -0.33 },
  },
  {
    name: "Orbital Lace",
    params: { a: -2.24, b: 0.43, c: -0.65, d: -2.43 },
  },
  {
    name: "Night Bloom",
    params: { a: -1.4, b: 1.6, c: 1.0, d: 0.7 },
  },
];

export function easeInOutCubic(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function interpolateParams(
  from: AttractorParams,
  to: AttractorParams,
  progress: number,
): AttractorParams {
  const t = Math.max(0, Math.min(1, progress));
  return {
    a: from.a + (to.a - from.a) * t,
    b: from.b + (to.b - from.b) * t,
    c: from.c + (to.c - from.c) * t,
    d: from.d + (to.d - from.d) * t,
  };
}

export function buildDelayEmbedding(
  params: AttractorParams,
  options: DelayEmbeddingOptions,
): Float32Array {
  const burnIn = Math.max(0, Math.floor(options.burnIn));
  const lag = Math.max(1, Math.floor(options.lag));
  const samples = Math.max(0, Math.floor(options.samples));
  const points = new Float32Array(samples * 3);
  const history: number[] = [];
  let point: Point = { x: 0, y: 0 };

  for (let index = 0; index < burnIn; index += 1) {
    point = finiteStep(point, params);
  }

  for (let index = 0; index < lag; index += 1) {
    point = finiteStep(point, params);
    history.push(point.x);
  }

  for (let index = 0; index < samples; index += 1) {
    point = finiteStep(point, params);
    const outputIndex = index * 3;
    points[outputIndex] = point.x;
    points[outputIndex + 1] = point.y;
    points[outputIndex + 2] = history.shift() ?? 0;
    history.push(point.x);
  }

  return points;
}

export function wrapJourneyIndex(index: number): number {
  const count = JOURNEY_PRESETS.length;
  return ((Math.floor(index) % count) + count) % count;
}

function finiteStep(point: Point, params: AttractorParams): Point {
  const next = stepAttractor(point, params);
  return Number.isFinite(next.x) && Number.isFinite(next.y)
    ? next
    : { x: 0, y: 0 };
}

