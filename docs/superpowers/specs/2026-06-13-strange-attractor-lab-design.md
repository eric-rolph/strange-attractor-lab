# Strange Attractor Lab Design

## Goal

Create a polished, interactive web page that makes the supplied strange-attractor equations visible and understandable, deploys as a Cloudflare Worker, and automatically redeploys from GitHub Actions on every push to `main`.

## Experience

The page opens on a full-screen density-rendered attractor with a warm cream-to-orange-to-red palette on a near-black field. A compact laboratory panel exposes the four coefficients, pause/resume, reset, and PNG export. Live statistics show total iterations, points per second, and peak pixel density.

Three concise explanatory cards connect the visual result to:

1. The iterative loop that repeatedly feeds each point into the next calculation.
2. Sensitive dependence and the bounded strange attractor.
3. The accumulation buffer and logarithmic color mapping.

## Architecture

- Vite and TypeScript build a dependency-light static frontend.
- A dedicated Web Worker owns an `OffscreenCanvas`, executes high-volume iteration batches, accumulates pixel hit counts, and renders density colors without blocking the interface.
- Pure attractor and density functions are separated from browser orchestration so their behavior can be tested with Vitest.
- A minimal Cloudflare Worker serves `/api/health`; Workers Static Assets serve the built frontend directly.
- GitHub Actions runs tests and the production build before deploying with Wrangler.

## Data Flow

The UI transfers the display canvas to the simulation worker, then sends resize and coefficient messages. The simulation worker repeatedly calculates the next point, maps it into canvas coordinates, and increments the corresponding density cell. At a capped refresh rate, the worker converts logarithmically normalized density into RGBA pixels and paints the canvas. It periodically sends statistics back to the UI.

## Reliability

- Rendering resolution is capped to keep memory and frame-generation cost bounded.
- Non-finite trajectories trigger a clean simulation reset.
- Resize and parameter changes create a fresh accumulation buffer.
- The Cloudflare Worker returns structured JSON for health and API errors.
- The Actions workflow cancels stale in-progress deployments.

## Testing

- Unit tests verify the supplied equations and long-run finite bounds.
- Unit tests verify density normalization and palette endpoints.
- Worker tests verify `/api/health`, unknown API handling, and asset delegation.
- Browser verification covers loading, progressive rendering, controls, responsive layout, and console errors.

