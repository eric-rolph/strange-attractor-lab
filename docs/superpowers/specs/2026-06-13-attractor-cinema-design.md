# Attractor Cinema Design

## Goal

Turn the existing laboratory from a static accumulation study into a moving mathematical instrument without sacrificing the clarity or performance of the current density view.

## Chosen Direction

The feature combines two complementary experiences:

1. **Field view** remains the high-detail 2D density visualization. Parameter changes morph smoothly through intermediate equation states, and previous structures fade rather than disappearing instantly.
2. **Orbit view** renders a genuine 3D delay embedding of the same 2D trajectory. The third dimension uses an earlier trajectory value, exposing folds that cannot be seen in the flat field. The user can drag to orbit, wheel or pinch to zoom, and enable a slow idle rotation.

Simply rotating the existing 2D image is excluded because it would only reveal a flat card and would imply spatial depth that the data does not contain.

## Experience

A compact viewport toolbar adds `Field` and `Orbit` view buttons plus `Morph` and `Auto journey` toggles.

In Field view:

- Slider changes interpolate from the current coefficient set to the requested set over approximately 1.4 seconds.
- The accumulation buffer decays during the transition, leaving dark-red remnants behind the newly forming cream-colored structure.
- Direct changes remain available when Morph is disabled.

In Orbit view:

- A WebGL point cloud uses `(x[n], y[n], x[n-lag])` delay embedding.
- Dragging changes yaw and pitch.
- Wheel or trackpad input changes camera distance.
- Idle auto-orbit produces slow continuous motion.
- Additive point rendering, depth-sensitive point size, warm color variation, and subtle fog preserve the visual language of the density field.

Auto journey moves through a curated loop of parameter presets. Each stop holds long enough to reveal its form, then morphs into the next. Manual slider input stops the journey so the user retains control.

## Architecture

### Pure Motion Module

`src/motion.ts` owns:

- coefficient interpolation,
- easing,
- delay-embedded point generation,
- curated journey presets.

These functions are independent of browser APIs and covered by unit tests.

### Density Simulation Worker

`src/simulation.worker.ts` gains a parameter-update mode:

- `reset` for immediate changes,
- `decay` for morph steps.

Decay reduces existing density values before continuing with the new coefficients, creating visual persistence while keeping the buffer bounded.

### Orbit Renderer

`src/orbit-renderer.ts` owns a WebGL2 program and camera state. It receives pure delay-embedded points, uploads them only when parameters change, and animates camera transforms with `requestAnimationFrame`. It does not own equation state or UI controls.

### UI Orchestration

`src/main.ts` owns the selected view, morph timeline, journey timeline, and synchronization between controls, the density worker, and the orbit renderer.

## Data Flow

1. A slider produces target coefficients.
2. With Morph enabled, the UI samples an eased interpolation timeline.
3. Each sample updates displayed equation values, sends a decaying parameter update to the density worker, and regenerates the orbit point cloud.
4. Field view displays accumulated transition history.
5. Orbit view displays the current trajectory and animates only the camera between parameter updates.

## Performance Boundaries

- Orbit clouds contain at most 90,000 points.
- Orbit geometry regenerates no more than roughly 12 times per second during morphs.
- WebGL animation changes camera uniforms without rebuilding geometry.
- The hidden density view pauses while Orbit view is active.
- `prefers-reduced-motion` disables auto-orbit and starts Morph disabled.

## Error Handling

- If WebGL2 is unavailable, Orbit is disabled and Field view remains fully functional.
- Non-finite trajectory points are omitted from orbit geometry.
- Camera pitch and zoom are clamped to prevent unusable viewpoints.
- Auto journey stops immediately on manual slider interaction.

## Testing

- Unit tests verify easing endpoints, coefficient interpolation, journey wrapping, delay embedding length, lag behavior, and finite output.
- Existing attractor, density, and Worker tests continue to pass.
- Browser verification covers view switching, drag orbit, zoom, morphing, journey animation, reduced-motion behavior, mobile layout, and console errors.

