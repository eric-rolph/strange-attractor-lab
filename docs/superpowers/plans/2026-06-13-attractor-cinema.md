# Attractor Cinema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add smooth equation morphing, curated parameter journeys, and a genuine interactive 3D orbit view to the strange-attractor laboratory.

**Architecture:** Pure motion helpers generate interpolated coefficients and delay-embedded trajectory points. The existing density worker gains decaying parameter updates, while a focused WebGL2 renderer owns the 3D point cloud and camera. The main UI orchestrates views and timelines.

**Tech Stack:** TypeScript, Vitest, Canvas 2D OffscreenCanvas, WebGL2, Vite, Cloudflare Workers

---

### Task 1: Pure Motion Mathematics

**Files:**
- Create: `src/motion.test.ts`
- Create: `src/motion.ts`

- [ ] Write failing tests for easing, coefficient interpolation, delay embedding, finite output, and journey wrapping.
- [ ] Run `npm test -- src/motion.test.ts` and verify failure because `src/motion.ts` does not exist.
- [ ] Implement the minimal pure motion helpers and curated presets.
- [ ] Run `npm test -- src/motion.test.ts` and verify the new tests pass.

### Task 2: Density Persistence During Morphs

**Files:**
- Modify: `src/simulation.worker.ts`

- [ ] Extend parameter messages with `transition: "reset" | "decay"`.
- [ ] Add bounded density decay before morph-step accumulation.
- [ ] Keep resize, restore, and explicit reset behavior as full resets.
- [ ] Run `npm test` and `npm run typecheck`.

### Task 3: WebGL Orbit Renderer

**Files:**
- Create: `src/orbit-renderer.ts`

- [ ] Create a WebGL2 renderer with additive point sprites and depth-aware color.
- [ ] Upload delay-embedded geometry only when equation parameters change.
- [ ] Add drag orbit, wheel zoom, camera clamping, auto-orbit, resize, and disposal.
- [ ] Run `npm run typecheck`.

### Task 4: Motion Controls and Orchestration

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] Add Field/Orbit view controls and Morph/Auto journey toggles.
- [ ] Add the orbit canvas and interaction hint to the viewport.
- [ ] Implement eased slider morphing and synchronize both renderers.
- [ ] Implement the curated auto-journey timeline and stop it on manual input.
- [ ] Respect `prefers-reduced-motion` and disable Orbit when WebGL2 is unavailable.
- [ ] Run `npm run build`.

### Task 5: Verify and Deploy

**Files:**
- Modify: `README.md`
- Update: `docs/superpowers/plans/2026-06-13-attractor-cinema.md`

- [ ] Run `npm run check`.
- [ ] Browser-test Field, Orbit, drag, zoom, Morph, Auto journey, mobile layout, and console errors.
- [ ] Update README feature documentation.
- [ ] Commit, push `main`, watch GitHub Actions complete, and verify the live Worker.

