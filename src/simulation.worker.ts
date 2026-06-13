import type { AttractorParams } from "./attractor";
import { colorizeDensity, normalizeDensity } from "./density";

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
};

type PauseMessage = {
  type: "pause";
  paused: boolean;
};

type ControlMessage =
  | InitMessage
  | ResizeMessage
  | ParamsMessage
  | PauseMessage
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
let imageData: ImageData | undefined;
let width = 0;
let height = 0;
let x = 0;
let y = 0;
let peak = 0;
let iterations = 0;
let paused = false;
let initialized = false;
let params: AttractorParams = { a: 1.51, b: -1.54, c: 1.36, d: -1.75 };
let lastRenderAt = 0;
let lastStatsAt = performance.now();
let lastStatsIterations = 0;

function resetBuffer(): void {
  density = new Uint32Array(width * height);
  imageData = context?.createImageData(width, height);
  x = 0;
  y = 0;
  peak = 0;
  iterations = 0;
  lastStatsIterations = 0;
  lastStatsAt = performance.now();
  render(performance.now());
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
    x = nextX;
    y = nextY;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = 0;
      y = 0;
      continue;
    }

    const pixelX = Math.floor(offsetX + x * scale);
    const pixelY = Math.floor(offsetY - y * scale);

    if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
      const densityIndex = pixelY * width + pixelX;
      const value = density[densityIndex] + 1;
      density[densityIndex] = value;
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
    const color = colorizeDensity(visibleDensity);
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
  scope.postMessage({ type: "stats", iterations, peak, rate, paused });
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
    resetBuffer();
  } else if (message.type === "pause") {
    paused = message.paused;
    scope.postMessage({ type: "stats", iterations, peak, rate: 0, paused });
  } else if (message.type === "reset") {
    resetBuffer();
  } else if (message.type === "export" && canvas) {
    void canvas.convertToBlob({ type: "image/png" }).then((blob) => {
      scope.postMessage({ type: "export", blob });
    });
  }
});

run();
