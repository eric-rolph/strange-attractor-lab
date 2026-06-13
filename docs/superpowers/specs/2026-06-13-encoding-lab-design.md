# Encoding Lab Design

## Goal

Turn the attractor from a single-palette artwork into a compact analytical
instrument. Color must describe a declared mathematical variable while
preserving density as the dominant structural signal.

## Information Design

The visualization remains the primary object. The introductory hero becomes a
short orientation strip, equations move beside the laboratory, and detached
explanation cards become concise annotations below the viewport.

Controls are grouped by purpose:

- **Equation** changes coefficients `a`, `b`, `c`, and `d`.
- **Encoding** chooses what hue represents.
- **View and motion** selects Field or Orbit, Morph, and Auto journey.
- **Actions** pauses, clears or resets, and exports.

Legends sit directly below the visualization. They explicitly state that
lightness represents visit density and hue represents the selected secondary
variable. Orbit view receives its own legend so its use of age and depth is no
longer ambiguous.

## Color Encodings

Field view supports four modes:

- **Density:** a perceptually ordered warm sequential palette. Both lightness
  and hue reinforce visit density.
- **Speed:** lightness shows density; hue moves from cool blue through teal to
  warm yellow as step distance increases.
- **Curvature:** lightness shows density; a diverging blue-neutral-red hue
  identifies left and right turns using signed turning angle.
- **Direction:** lightness shows density; cyclic hue shows the angle of travel
  through each region.

Empty pixels remain the same near-black field color in all modes. Signal values
are accumulated per pixel and averaged across visits. Selecting a different
encoding clears the field so every displayed sample has a consistent meaning.

## Mathematical Summaries

Replace implementation-oriented peak density with:

- **Coverage:** percentage of viewport pixels visited at least once.
- **Mean signal:** average speed, signed curvature, or circular mean heading
  for the selected encoding; density mode reports maximum pixel hits.

Iterations remain visible as useful sampling context. Render rate moves to a
small secondary status line.

## Rendering Architecture

Pure functions in `src/density.ts` define signal normalization, palettes, and
bivariate color mapping. The simulation worker maintains density and signal-sum
buffers, computes the selected signal during iteration, and reports coverage
and mean signal. The main thread owns only UI state and sends encoding changes
to the worker.

Orbit rendering remains WebGL-based and unchanged mathematically. Its adjacent
legend makes the current age/depth encoding explicit.

## Accessibility And Performance

Palettes avoid rainbow ordering and use strong lightness contrast. Controls use
real buttons with pressed states and concise explanatory text. Density mode
does not calculate an unnecessary secondary signal. Signal accumulation adds
one floating-point buffer and remains inside the existing worker.

## Verification

Unit tests cover normalization and palette endpoints. Existing attractor,
motion, Worker, typecheck, build, and Wrangler dry-run checks must continue to
pass. Browser verification covers every encoding, legends, Field and Orbit
views, equation controls, responsive layout, and console errors.
