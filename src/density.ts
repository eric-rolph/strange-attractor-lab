type Rgba = [number, number, number, number];
type Rgb = [number, number, number];

export type FieldEncoding = "density" | "speed" | "curvature" | "direction";

const PALETTE: Rgba[] = [
  [5, 4, 3, 255],
  [24, 7, 4, 255],
  [76, 12, 7, 255],
  [150, 37, 13, 255],
  [229, 104, 34, 255],
  [255, 191, 103, 255],
  [255, 242, 199, 255],
];

const FIELD_COLOR: Rgb = [5, 4, 3];
const SIGNAL_PALETTES: Record<Exclude<FieldEncoding, "density">, Rgb[]> = {
  speed: [
    [39, 67, 118],
    [34, 126, 148],
    [103, 181, 146],
    [220, 209, 105],
    [255, 231, 156],
  ],
  curvature: [
    [48, 111, 160],
    [121, 171, 190],
    [224, 218, 199],
    [211, 133, 96],
    [167, 60, 49],
  ],
  direction: [
    [62, 149, 169],
    [218, 205, 101],
    [221, 112, 80],
    [139, 105, 170],
    [62, 149, 169],
  ],
};

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

export function normalizeSignal(
  encoding: Exclude<FieldEncoding, "density">,
  value: number,
): number {
  if (encoding === "speed") {
    return clamp(value / 3);
  }

  if (encoding === "curvature") {
    return clamp((value + Math.PI) / (Math.PI * 2));
  }

  return (((value / (Math.PI * 2)) % 1) + 1) % 1;
}

export function colorizeField(
  normalizedDensity: number,
  normalizedSignal: number,
  encoding: FieldEncoding,
): Rgba {
  const density = clamp(normalizedDensity);
  if (density === 0) {
    return [...FIELD_COLOR, 255];
  }

  if (encoding === "density") {
    return colorizeDensity(density);
  }

  const signalColor = interpolatePalette(
    SIGNAL_PALETTES[encoding],
    clamp(normalizedSignal),
  );
  const strength = 0.12 + 0.88 * Math.sqrt(density);

  return [
    Math.round(FIELD_COLOR[0] + (signalColor[0] - FIELD_COLOR[0]) * strength),
    Math.round(FIELD_COLOR[1] + (signalColor[1] - FIELD_COLOR[1]) * strength),
    Math.round(FIELD_COLOR[2] + (signalColor[2] - FIELD_COLOR[2]) * strength),
    255,
  ];
}

function interpolatePalette(palette: Rgb[], normalized: number): Rgb {
  const scaled = normalized * (palette.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(palette.length - 1, lowerIndex + 1);
  const mix = scaled - lowerIndex;
  const lower = palette[lowerIndex];
  const upper = palette[upperIndex];

  return [
    Math.round(lower[0] + (upper[0] - lower[0]) * mix),
    Math.round(lower[1] + (upper[1] - lower[1]) * mix),
    Math.round(lower[2] + (upper[2] - lower[2]) * mix),
  ];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
