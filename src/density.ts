type Rgba = [number, number, number, number];

const PALETTE: Rgba[] = [
  [5, 4, 3, 255],
  [24, 7, 4, 255],
  [76, 12, 7, 255],
  [150, 37, 13, 255],
  [229, 104, 34, 255],
  [255, 191, 103, 255],
  [255, 242, 199, 255],
];

export function normalizeDensity(value: number, peak: number): number {
  if (value <= 0 || peak <= 0) {
    return 0;
  }

  return Math.min(1, Math.log1p(value) / Math.log1p(peak));
}

export function colorizeDensity(normalized: number): Rgba {
  const clamped = Math.max(0, Math.min(1, normalized));
  const scaled = clamped * (PALETTE.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(PALETTE.length - 1, lowerIndex + 1);
  const mix = scaled - lowerIndex;
  const lower = PALETTE[lowerIndex];
  const upper = PALETTE[upperIndex];

  return [
    Math.round(lower[0] + (upper[0] - lower[0]) * mix),
    Math.round(lower[1] + (upper[1] - lower[1]) * mix),
    Math.round(lower[2] + (upper[2] - lower[2]) * mix),
    255,
  ];
}

