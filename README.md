# Strange Attractor Laboratory

An interactive, density-rendered De Jong strange attractor:

```text
x' = sin(1.51y) - cos(-1.54x)
y' = sin(1.36x) - cos(-1.75y)
```

The browser runs millions of iterations in a dedicated Web Worker, accumulates
pixel hit counts, and maps logarithmic density through an analytical color
model. The UI stays responsive while the image grows increasingly detailed.

[Open the live laboratory](https://strange-attractor-lab.ericrolph.workers.dev/)

## Motion modes

- **Field** renders the high-detail 2D density accumulation.
- **Orbit** turns the trajectory into a genuine 3D delay embedding. Drag to orbit and use the wheel or trackpad to zoom.
- **Morph** eases slider changes through intermediate equation states while previous structures fade.
- **Auto journey** moves through curated coefficient presets and can be stopped at any point for manual exploration.

## Analytical color

Lightness always represents visit density. Field view can use hue to reveal a
second mathematical property without losing the attractor's spatial structure:

- **Density** uses a warm sequential palette to show visit frequency alone.
- **Speed** shows the distance traveled between successive points.
- **Curvature** uses a diverging palette to show signed left and right turns.
- **Direction** uses cyclic hue to show the orbit's angle of travel.

Adjacent legends state the active encoding. The viewport also reports pixel
coverage and a summary of the selected signal.

## Local development

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Verification

```bash
npm run check
```

This runs the test suite, typecheck, production build, and a Wrangler dry-run deployment.

## Deployment

Pushes to `main` run [the GitHub Actions workflow](.github/workflows/deploy.yml), which tests, builds, and deploys the application to Cloudflare Workers.

The repository requires two Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The token should have permission to edit Workers.

## Architecture

- `src/attractor.ts`: pure attractor equations
- `src/density.ts`: density and signal normalization plus bivariate palette mapping
- `src/simulation.worker.ts`: high-volume simulation and `OffscreenCanvas` rendering
- `src/main.ts`: controls, statistics, resize handling, and export
- `worker/index.ts`: Cloudflare Worker health endpoint and static asset delegation
