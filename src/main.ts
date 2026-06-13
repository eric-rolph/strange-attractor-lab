import type { AttractorParams } from "./attractor";
import { DEFAULT_PARAMS } from "./attractor";
import "./styles.css";

type StatsMessage = {
  type: "stats";
  iterations: number;
  peak: number;
  rate: number;
  paused: boolean;
};

type ExportMessage = {
  type: "export";
  blob: Blob;
};

const canvas = getElement<HTMLCanvasElement>("attractor-canvas");
const canvasMessage = getElement<HTMLDivElement>("canvas-message");
const iterationsElement = getElement<HTMLSpanElement>("iterations");
const rateElement = getElement<HTMLSpanElement>("rate");
const peakElement = getElement<HTMLSpanElement>("peak");
const runStatus = getElement<HTMLSpanElement>("run-status");
const pauseButton = getElement<HTMLButtonElement>("pause-button");
const pauseLabel = getElement<HTMLSpanElement>("pause-label");
const resetButton = getElement<HTMLButtonElement>("reset-button");
const restoreButton = getElement<HTMLButtonElement>("restore-button");
const exportButton = getElement<HTMLButtonElement>("export-button");
const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-param]"));

const numberFormat = new Intl.NumberFormat("en-US");
let params: AttractorParams = { ...DEFAULT_PARAMS };
let paused = false;
let parameterTimer: number | undefined;

if (!("transferControlToOffscreen" in canvas)) {
  showMessage("This visualizer requires a browser with OffscreenCanvas support.");
  throw new Error("OffscreenCanvas is not supported");
}

const simulation = new Worker(new URL("./simulation.worker.ts", import.meta.url), {
  type: "module",
});
const offscreen = canvas.transferControlToOffscreen();
const initialSize = getCanvasSize();

simulation.postMessage(
  {
    type: "init",
    canvas: offscreen,
    width: initialSize.width,
    height: initialSize.height,
    params,
  },
  [offscreen],
);

const resizeObserver = new ResizeObserver(() => {
  const size = getCanvasSize();
  simulation.postMessage({ type: "resize", ...size });
});
resizeObserver.observe(canvas);

simulation.addEventListener("message", (event: MessageEvent<StatsMessage | ExportMessage>) => {
  const message = event.data;

  if (message.type === "stats") {
    iterationsElement.textContent = compactNumber(message.iterations);
    iterationsElement.title = numberFormat.format(message.iterations);
    rateElement.textContent = compactNumber(message.rate);
    peakElement.textContent = numberFormat.format(message.peak);
    runStatus.textContent = message.paused ? "Paused" : "Accumulating";
    return;
  }

  const url = URL.createObjectURL(message.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `strange-attractor-${new Date().toISOString().slice(0, 10)}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  exportButton.textContent = "Export PNG";
});

simulation.addEventListener("error", () => {
  showMessage("The simulation stopped unexpectedly. Reload the page to restart it.");
  runStatus.textContent = "Simulation error";
});

for (const input of inputs) {
  input.addEventListener("input", () => {
    const key = input.dataset.param as keyof AttractorParams;
    params[key] = Number(input.value);
    updateParameterDisplay(key, params[key]);

    window.clearTimeout(parameterTimer);
    parameterTimer = window.setTimeout(() => {
      simulation.postMessage({ type: "params", params });
    }, 120);
  });
}

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.classList.toggle("is-paused", paused);
  pauseLabel.textContent = paused ? "Resume" : "Pause";
  runStatus.textContent = paused ? "Paused" : "Accumulating";
  simulation.postMessage({ type: "pause", paused });
});

resetButton.addEventListener("click", () => {
  simulation.postMessage({ type: "reset" });
  pulseButton(resetButton, "Density cleared");
});

restoreButton.addEventListener("click", () => {
  params = { ...DEFAULT_PARAMS };
  for (const input of inputs) {
    const key = input.dataset.param as keyof AttractorParams;
    input.value = String(params[key]);
    updateParameterDisplay(key, params[key]);
  }
  simulation.postMessage({ type: "params", params });
});

exportButton.addEventListener("click", () => {
  exportButton.textContent = "Preparing image...";
  simulation.postMessage({ type: "export" });
});

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

function getCanvasSize(): { width: number; height: number } {
  const bounds = canvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 1.35);
  const maxDimension = 1_200;
  const ratio = Math.min(1, maxDimension / Math.max(bounds.width * scale, bounds.height * scale));

  return {
    width: Math.max(1, Math.round(bounds.width * scale * ratio)),
    height: Math.max(1, Math.round(bounds.height * scale * ratio)),
  };
}

function updateParameterDisplay(key: keyof AttractorParams, value: number): void {
  const formatted = value.toFixed(2).replace("-", "−");
  getElement<HTMLOutputElement>(`value-${key}`).value = formatted;
  getElement<HTMLElement>(`equation-${key}`).textContent = formatted;
}

function compactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return numberFormat.format(value);
}

function pulseButton(button: HTMLButtonElement, text: string): void {
  const original = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = original;
  }, 900);
}

function showMessage(message: string): void {
  canvasMessage.hidden = false;
  canvasMessage.textContent = message;
}
