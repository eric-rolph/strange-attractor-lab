export type Point = {
  x: number;
  y: number;
};

export type AttractorParams = {
  a: number;
  b: number;
  c: number;
  d: number;
};

export const DEFAULT_PARAMS: AttractorParams = {
  a: 1.51,
  b: -1.54,
  c: 1.36,
  d: -1.75,
};

export function stepAttractor(
  point: Point,
  params: AttractorParams,
): Point {
  return {
    x: Math.sin(params.a * point.y) - Math.cos(params.b * point.x),
    y: Math.sin(params.c * point.x) - Math.cos(params.d * point.y),
  };
}

export function iteratePoint(
  point: Point,
  params: AttractorParams,
): Point {
  return stepAttractor(point, params);
}

