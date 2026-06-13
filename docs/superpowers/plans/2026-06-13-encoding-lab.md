# Encoding Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mathematically meaningful color encodings and reorganize the laboratory around direct, Tufte-style explanations.

**Architecture:** Keep color mathematics pure in `src/density.ts`; accumulate the selected secondary signal in the simulation worker; keep the main thread responsible for controls and legends. Preserve the existing Orbit renderer and motion behavior.

**Tech Stack:** TypeScript, Canvas 2D, Web Workers, WebGL2, Vite, Vitest, Cloudflare Workers

---

### Task 1: Bivariate Color Model

**Files:**
- Modify: `src/density.ts`
- Modify: `src/density.test.ts`

- [x] Write failing tests for speed, curvature, and direction normalization and for density-preserving bivariate colors.
- [x] Run `npm test -- src/density.test.ts` and confirm the new tests fail because the APIs do not exist.
- [x] Implement the minimal pure normalization and color functions.
- [x] Run `npm test -- src/density.test.ts` and confirm all density tests pass.

### Task 2: Signal Accumulation

**Files:**
- Modify: `src/simulation.worker.ts`
- Modify: `src/main.ts`

- [x] Add an encoding control message and reset signal state when encoding changes.
- [x] Accumulate speed, signed curvature, or cyclic direction for the selected mode.
- [x] Render hue from the average signal while retaining density-driven lightness.
- [x] Report coverage and selected-signal summaries to the main thread.

### Task 3: Information-Dense Interface

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/main.ts`

- [x] Compress the introductory content and bring the laboratory above the fold.
- [x] Group Equation, Encoding, Motion, and Actions controls.
- [x] Add direct field and orbit legends with explicit color semantics.
- [x] Replace peak-density telemetry with coverage and selected-signal summaries.
- [x] Replace detached cards with concise analytical annotations.

### Task 4: Verification And Release

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-13-encoding-lab.md`

- [x] Run `npm run check`.
- [x] Browser-test all encodings, Field, Orbit, Morph, Auto journey, export, responsive layout, and console errors.
- [x] Update README feature documentation.
- [ ] Commit, push `main`, watch GitHub Actions complete, and verify the live Worker.
