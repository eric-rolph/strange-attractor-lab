import type { AttractorParams } from "./attractor";
import type { FieldEncoding } from "./density";
import { colorizeField, normalizeDensity, normalizeSignal } from "./density";

type InitMessage = {
  type: "init";
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  params: AttractorParams;
};

type ResizeMessage = {
  type: "resize";
  width: number;
  height: number;
};

type ParamsMessage = {
  type: "params";
  params: AttractorParams;
  transition?: "reset" | "decay";
};

type PauseMessage = {
  type: "pause";
  paused: boolean;
};

type EncodingMessage = {
  type: "encoding";
  encoding: FieldEncoding;
};

type ControlMessage =
  | InitMessage
  | ResizeMessage
  | ParamsMessage
  | PauseMessage
  | EncodingMessage
  | { type: "reset" }
  | { type: "export" };

const scope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;
const BATCH_SIZE = 120_000;
const RENDER_INTERVAL_MS = 75;
const STATS_INTERVAL_MS = 500;
const WORLD_SPAN = 4.3;

let canvas: OffscreenCanvas | undefined;
let context: OffscreenCanvasRenderingContext2D | null = null;
let density = new Uint32Array(0);
let signalSums = new Float32Array(0);
let signalAuxSums = new Float32Array(0);
let imageData: ImageData | undefined;
let width = 0;
let height = 0;
let x = 0;
let y = 0;
let velocityX = 0;
let velocityY = 0;
let peak = 0;
let occupied = 0;
let iterations = 0;
let signalTotal = 0;
let signalAuxTotal = 0;
let signalSamples = 0;
let paused = false;
let initialized = false;
let encoding: FieldEncoding = "density";
let params: AttractorParams = { a: 1.51, b: -1.54, c: 1.36, d: -1.75 };
let lastRenderAt = 0;
let lastStatsAt = performance.now();
let lastStatsIterations = 0;

function resetBuffer(): void {
  density = new Uint32Array(width * height);
  signalSums = new Float32Array(width * height);
  signalAuxSums = new Float32Array(width * height);
  imageData = context?.createImageData(width, height);
  x = 0;
  y = 0;
  velocityX = 0;
  velocityY = 0;
  peak = 0;
  occupied = 0;
  iterations = 0;
  signalTotal = 0;
  signalAuxTotal = 0;
  signalSamples = 0;
  lastStatsIterations = 0;
  lastStatsAt = performance.now();
  render(performance.now());
}

function decayBuffer(retention = 0.94): void {
  let nextPeak = 0;
  let nextOccupied = 0;

  for (let index = 0; index < density.length; index += 1) {
    const value = Math.floor(density[index] * retention);
    density[index] = value;
    signalSums[index] *= retention;
    signalAuxSums[index] *= retention;
    if (value > 0) {
      nextOccupied += 1;
    }
    if (value > nextPeak) {
      nextPeak = value;
    }
  }

  peak = nextPeak;
  occupied = nextOccupied;
  signalTotal *= retention;
  signalAuxTotal *= retention;
  signalSamples *= retention;
}

function resize(nextWidth: number, nextHeight: number): void {
  if (!canvas || !context) {
    return;
  }

  width = Math.max(1, Math.floor(nextWidth));
  height = Math.max(1, Math.floor(nextHeight));
  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = false;
  resetBuffer();
}

function accumulate(): void {
  const scale = Math.min(width, height) / WORLD_SPAN;
  const offsetX = width / 2;
  const offsetY = height / 2;

  for (let index = 0; index < BATCH_SIZE; index += 1) {
    const nextX = Math.sin(params.a * y) - Math.cos(params.b * x);
    const nextY = Math.sin(params.c * x) - Math.cos(params.d * y);
    const nextVelocityX = nextX - x;
    const nextVelocityY = nextY - y;
    const signal = calculateSignal(nextVelocityX, nextVelocityY);
    x = nextX;
    y = nextY;
    velocityX = nextVelocityX;
    velocityY = nextVelocityY;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = 0;
      y = 0;
      velocityX = 0;
      velocityY = 0;
      continue;
    }

    const pixelX = Math.floor(offsetX + x * scale);
    const pixelY = Math.floor(offsetY - y * scale);

    if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
      const densityIndex = pixelY * width + pixelX;
      const value = density[densityIndex] + 1;
      if (density[densityIndex] === 0) {
        occupied += 1;
      }
      density[densityIndex] = value;
      accumulateSignal(densityIndex, signal);
      if (value > peak) {
        peak = value;
      }
    }
  }

  iterations += BATCH_SIZE;
}

function render(now: number): void {
  if (!context || !imageData) {
    return;
  }

  const pixels = imageData.data;
  const densityCap = Math.max(256, Math.floor(iterations / 40_000));
  const displayPeak = Math.max(32, Math.min(Math.floor(peak * 0.015), densityCap));
  for (let index = 0; index < density.length; index += 1) {
    const normalized = normalizeDensity(density[index], displayPeak);
    const visibleDensity =
      density[index] > 0 ? 0.12 + 0.88 * Math.pow(normalized, 0.5) : 0;
    const normalizedSignal = getNormalizedPixelSignal(index);
    const color = colorizeField(visibleDensity, normalizedSignal, encoding);
    const pixelIndex = index * 4;
    pixels[pixelIndex] = color[0];
    pixels[pixelIndex + 1] = color[1];
    pixels[pixelIndex + 2] = color[2];
    pixels[pixelIndex + 3] = color[3];
  }

  context.putImageData(imageData, 0, 0);
  lastRenderAt = now;
}

function postStats(now: number): void {
  const elapsed = now - lastStatsAt;
  if (elapsed < STATS_INTERVAL_MS) {
    return;
  }

  const rate = Math.round(((iterations - lastStatsIterations) * 1000) / elapsed);
  const coverage = density.length > 0 ? occupied / density.length : 0;
  const meanSignal =
    encoding === "direction"
      ? Math.atan2(signalTotal, signalAuxTotal)
      : signalSamples > 0
        ? signalTotal / signalSamples
        : 0;
  scope.postMessage({
    type: "stats",
    iterations,
    peak,
    rate,
    paused,
    coverage,
    meanSignal,
  });
  lastStatsAt = now;
  lastStatsIterations = iterations;
}

function run(): void {
  if (initialized && !paused) {
    accumulate();
    const now = performance.now();
    if (now - lastRenderAt >= RENDER_INTERVAL_MS) {
      render(now);
    }
    postStats(now);
  }

  scope.setTimeout(run, 0);
}

scope.addEventListener("message", (event: MessageEvent<ControlMessage>) => {
  const message = event.data;

  if (message.type === "init") {
    canvas = message.canvas;
    context = canvas.getContext("2d", { alpha: false });
    params = message.params;
    initialized = true;
    resize(message.width, message.height);
    return;
  }

  if (!initialized) {
    return;
  }

  if (message.type === "resize") {
    resize(message.width, message.height);
  } else if (message.type === "params") {
    params = message.params;
    if (message.transition === "decay") {
      decayBuffer();
    } else {
      resetBuffer();
    }
  } else if (message.type === "pause") {
    paused = message.paused;
    const coverage = density.length > 0 ? occupied / density.length : 0;
    const meanSignal =
      encoding === "direction"
        ? Math.atan2(signalTotal, signalAuxTotal)
        : signalSamples > 0
          ? signalTotal / signalSamples
          : 0;
    scope.postMessage({
      type: "stats",
      iterations,
      peak,
      rate: 0,
      paused,
      coverage,
      meanSignal,
    });
  } else if (message.type === "encoding") {
    encoding = message.encoding;
    resetBuffer();
  } else if (message.type === "reset") {
    resetBuffer();
  } else if (message.type === "export" && canvas) {
    void canvas.convertToBlob({ type: "image/png" }).then((blob) => {
      scope.postMessage({ type: "export", blob });
    });
  }
});

run();

function calculateSignal(
  nextVelocityX: number,
  nextVelocityY: number,
): number {
  if (encoding === "speed") {
    return Math.hypot(nextVelocityX, nextVelocityY);
  }

  if (encoding === "curvature") {
    const cross = velocityX * nextVelocityY - velocityY * nextVelocityX;
    const dot = velocityX * nextVelocityX + velocityY * nextVelocityY;
    return Math.atan2(cross, dot);
  }

  if (encoding === "direction") {
    return Math.atan2(nextVelocityY, nextVelocityX);
  }

  return 0;
}

function accumulateSignal(index: number, signal: number): void {
  if (encoding === "density") {
    return;
  }

  if (encoding === "direction") {
    signalSums[index] += Math.sin(signal);
    signalAuxSums[index] += Math.cos(signal);
    signalTotal += Math.sin(signal);
    signalAuxTotal += Math.cos(signal);
  } else {
    signalSums[index] += signal;
    signalTotal += signal;
  }

  signalSamples += 1;
}

function getNormalizedPixelSignal(index: number): number {
  if (encoding === "density" || density[index] === 0) {
    return 0;
  }

  if (encoding === "direction") {
    const angle = Math.atan2(signalSums[index], signalAuxSums[index]);
    return normalizeSignal("direction", angle);
  }

  return normalizeSignal(encoding, signalSums[index] / density[index]);
}
