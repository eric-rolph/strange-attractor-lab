# Strange Attractor Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy an interactive density-rendered strange attractor visualizer from GitHub to Cloudflare Workers.

**Architecture:** Pure TypeScript modules implement the attractor equations and density color mapping. A browser Web Worker performs the expensive simulation and paints an `OffscreenCanvas`; a minimal Cloudflare Worker serves health JSON while Static Assets serve the Vite build.

**Tech Stack:** TypeScript, Vite, Vitest, Canvas 2D, Web Workers, Cloudflare Workers Static Assets, Wrangler, GitHub Actions

---

### Task 1: Pin Core Mathematical Behavior

**Files:**
- Create: `src/attractor.test.ts`
- Create: `src/density.test.ts`
- Create: `src/attractor.ts`
- Create: `src/density.ts`

- [x] Write tests for the supplied coefficients, origin step, long-run finite bounds, logarithmic normalization, and palette endpoints.
- [x] Run `npm test` and verify failure because the implementation modules do not exist.
- [x] Implement the pure attractor and density functions.
- [x] Run `npm test` and verify the core tests pass.

### Task 2: Implement Worker Routing

**Files:**
- Create: `worker/index.test.ts`
- Create: `worker/index.ts`
- Generate: `worker-configuration.d.ts`

- [x] Write tests for health JSON, unknown API routes, and static asset delegation.
- [x] Run `npm test` and verify failure because the Worker handler does not exist.
- [x] Implement the Worker handler and generate binding types with `npm run cf-types`.
- [x] Run `npm test` and verify all tests pass.

### Task 3: Build the Interactive Visualizer

**Files:**
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/simulation.worker.ts`
- Create: `src/styles.css`
- Create: `public/_headers`

- [x] Build the accessible page shell, equation controls, explanatory cards, and live statistics.
- [x] Implement the off-main-thread accumulation renderer and message protocol.
- [x] Implement responsive styling and static security headers.
- [x] Run `npm run build` and fix all type/build errors.

### Task 4: Verify and Publish

**Files:**
- Create: `README.md`
- Verify: `.github/workflows/deploy.yml`

- [x] Run `npm run check`.
- [x] Start the local Worker preview and verify it in the browser.
- [ ] Create the GitHub repository and configure Cloudflare Actions secrets.
- [ ] Push `main`, watch the Actions deployment complete, and verify the live Workers URL.
