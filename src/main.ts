import type { AttractorParams } from "./attractor";
import { DEFAULT_PARAMS } from "./attractor";
import { OrbitRenderer } from "./orbit-renderer";
import {
  JOURNEY_PRESETS,
  easeInOutCubic,
  interpolateParams,
  wrapJourneyIndex,
} from "./motion";
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

type ViewMode = "field" | "orbit";

const fieldCanvas = getElement<HTMLCanvasElement>("attractor-canvas");
const orbitCanvas = getElement<HTMLCanvasElement>("orbit-canvas");
const canvasWrap = getElement<HTMLDivElement>("canvas-wrap");
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
const fieldViewButton = getElement<HTMLButtonElement>("field-view-button");
const orbitViewButton = getElement<HTMLButtonElement>("orbit-view-button");
const morphButton = getElement<HTMLButtonElement>("morph-button");
const journeyButton = getElement<HTMLButtonElement>("journey-button");
const journeyLabel = getElement<HTMLSpanElement>("journey-label");
const orbitHint = getElement<HTMLDivElement>("orbit-hint");
const viewportKicker = getElement<HTMLElement>("viewport-kicker");
const viewportTitle = getElement<HTMLElement>("viewport-title");
const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-param]"));
const axisLabels = Array.from(document.querySelectorAll<HTMLElement>(".axis-label"));

const numberFormat = new Intl.NumberFormat("en-US");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let params: AttractorParams = { ...DEFAULT_PARAMS };
let paused = false;
let view: ViewMode = "field";
let morphEnabled = !reducedMotion;
let morphFrame: number | undefined;
let journeyEnabled = false;
let journeyIndex = 1;
let journeyTimer: number | undefined;
let lastOrbitUpdate = 0;

if (!("transferControlToOffscreen" in fieldCanvas)) {
  showMessage("This visualizer requires a browser with OffscreenCanvas support.");
  throw new Error("OffscreenCanvas is not supported");
}

const simulation = new Worker(new URL("./simulation.worker.ts", import.meta.url), {
  type: "module",
});
const orbitRenderer = new OrbitRenderer(orbitCanvas);
const offscreen = fieldCanvas.transferControlToOffscreen();
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
orbitRenderer.updateParams(params);
orbitRenderer.setAutoOrbit(!reducedMotion);

setPressed(morphButton, morphEnabled);
if (!orbitRenderer.available) {
  orbitViewButton.disabled = true;
  orbitViewButton.title = "Orbit view requires WebGL2";
}

const resizeObserver = new ResizeObserver(() => {
  const size = getCanvasSize();
  simulation.postMessage({ type: "resize", ...size });
  orbitRenderer.resize();
});
resizeObserver.observe(canvasWrap);

simulation.addEventListener("message", (event: MessageEvent<StatsMessage | ExportMessage>) => {
  const message = event.data;

  if (message.type === "stats") {
    iterationsElement.textContent = compactNumber(message.iterations);
    iterationsElement.title = numberFormat.format(message.iterations);
    rateElement.textContent = compactNumber(message.rate);
    peakElement.textContent = numberFormat.format(message.peak);
    updateRunStatus();
    return;
  }

  downloadBlob(message.blob);
});

simulation.addEventListener("error", () => {
  showMessage("The simulation stopped unexpectedly. Reload the page to restart it.");
  runStatus.textContent = "Simulation error";
});

for (const input of inputs) {
  input.addEventListener("input", () => {
    stopJourney();
    const key = input.dataset.param as keyof AttractorParams;
    const target = { ...params, [key]: Number(input.value) };
    if (morphEnabled) {
      startMorph(target, 1_400);
    } else {
      applyParams(target, "reset");
    }
  });
}

pauseButton.addEventListener("click", () => {
  paused = !paused;
  if (paused) {
    stopJourney();
    cancelMorph();
  }
  pauseButton.classList.toggle("is-paused", paused);
  pauseLabel.textContent = paused ? "Resume" : "Pause";
  applyPauseState();
});

resetButton.addEventListener("click", () => {
  if (view === "orbit") {
    orbitRenderer.resetCamera();
    pulseButton(resetButton, "Camera reset");
  } else {
    simulation.postMessage({ type: "reset" });
    pulseButton(resetButton, "Density cleared");
  }
});

restoreButton.addEventListener("click", () => {
  stopJourney();
  cancelMorph();
  applyParams({ ...DEFAULT_PARAMS }, "reset");
});

exportButton.addEventListener("click", () => {
  exportButton.textContent = "Preparing image...";
  if (view === "orbit") {
    orbitCanvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob);
      }
    }, "image/png");
  } else {
    simulation.postMessage({ type: "export" });
  }
});

fieldViewButton.addEventListener("click", () => setView("field"));
orbitViewButton.addEventListener("click", () => setView("orbit"));

morphButton.addEventListener("click", () => {
  morphEnabled = !morphEnabled;
  setPressed(morphButton, morphEnabled);
  if (!morphEnabled) {
    cancelMorph();
  }
});

journeyButton.addEventListener("click", () => {
  if (journeyEnabled) {
    stopJourney();
  } else {
    startJourney();
  }
});

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

function getCanvasSize(): { width: number; height: number } {
  const bounds = canvasWrap.getBoundingClientRect();
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

function applyParams(
  next: AttractorParams,
  transition: "reset" | "decay",
): void {
  params = next;
  syncControls();
  simulation.postMessage({ type: "params", params, transition });

  const now = performance.now();
  if (transition === "reset" || now - lastOrbitUpdate > 85) {
    orbitRenderer.updateParams(params);
    lastOrbitUpdate = now;
  }
}

function syncControls(): void {
  for (const input of inputs) {
    const key = input.dataset.param as keyof AttractorParams;
    input.value = String(params[key]);
    updateParameterDisplay(key, params[key]);
  }
}

function startMorph(target: AttractorParams, duration: number): void {
  cancelMorph();
  const from = { ...params };
  const startedAt = performance.now();
  let lastDispatch = 0;

  const frame = (now: number): void => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const next = interpolateParams(from, target, easeInOutCubic(progress));
    if (now - lastDispatch >= 85 || progress === 1) {
      applyParams(next, "decay");
      lastDispatch = now;
    }

    if (progress < 1) {
      morphFrame = requestAnimationFrame(frame);
    } else {
      morphFrame = undefined;
      applyParams({ ...target }, "decay");
      updateRunStatus();
    }
  };

  morphFrame = requestAnimationFrame(frame);
  updateRunStatus();
}

function cancelMorph(): void {
  if (morphFrame !== undefined) {
    cancelAnimationFrame(morphFrame);
    morphFrame = undefined;
  }
}

function startJourney(): void {
  journeyEnabled = true;
  setPressed(journeyButton, true);
  runJourneyStep();
}

function runJourneyStep(): void {
  if (!journeyEnabled) {
    return;
  }

  const preset = JOURNEY_PRESETS[wrapJourneyIndex(journeyIndex)];
  journeyLabel.textContent = preset.name;
  startMorph(preset.params, 4_600);
  journeyIndex = wrapJourneyIndex(journeyIndex + 1);
  journeyTimer = window.setTimeout(runJourneyStep, 6_800);
  updateRunStatus();
}

function stopJourney(): void {
  const wasJourneyEnabled = journeyEnabled;
  journeyEnabled = false;
  window.clearTimeout(journeyTimer);
  journeyTimer = undefined;
  if (wasJourneyEnabled) {
    cancelMorph();
  }
  journeyLabel.textContent = "Auto journey";
  setPressed(journeyButton, false);
  updateRunStatus();
}

function setView(nextView: ViewMode): void {
  if (nextView === "orbit" && !orbitRenderer.available) {
    return;
  }

  view = nextView;
  const orbiting = view === "orbit";
  fieldCanvas.hidden = orbiting;
  orbitCanvas.hidden = !orbiting;
  orbitHint.hidden = !orbiting;
  for (const label of axisLabels) {
    label.hidden = orbiting;
  }
  resetButton.textContent = orbiting ? "Reset camera" : "Reset density";
  viewportKicker.textContent = orbiting
    ? "Delay embedding / WebGL point cloud"
    : "Live accumulation buffer";
  viewportTitle.textContent = orbiting ? "Delay-embedded orbit" : "Density field";
  setPressed(fieldViewButton, !orbiting);
  setPressed(orbitViewButton, orbiting);
  orbitRenderer.setActive(orbiting);
  applyPauseState();
}

function applyPauseState(): void {
  simulation.postMessage({ type: "pause", paused: paused || view === "orbit" });
  orbitRenderer.setAutoOrbit(!paused && !reducedMotion);
  updateRunStatus();
}

function updateRunStatus(): void {
  if (paused) {
    runStatus.textContent = "Paused";
  } else if (journeyEnabled) {
    runStatus.textContent = "Auto journey";
  } else if (morphFrame !== undefined) {
    runStatus.textContent = "Morphing";
  } else {
    runStatus.textContent = view === "orbit" ? "Orbiting" : "Accumulating";
  }
}

function setPressed(button: HTMLButtonElement, pressed: boolean): void {
  button.classList.toggle("is-active", pressed);
  button.setAttribute("aria-pressed", String(pressed));
}

function downloadBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `strange-attractor-${view}-${new Date().toISOString().slice(0, 10)}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  exportButton.textContent = "Export PNG";
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
