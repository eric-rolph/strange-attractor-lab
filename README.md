# Strange Attractor Laboratory

An interactive, density-rendered De Jong strange attractor:

```text
x' = sin(1.51y) - cos(-1.54x)
y' = sin(1.36x) - cos(-1.75y)
```

The browser runs millions of iterations in a dedicated Web Worker, accumulates pixel hit counts, and maps logarithmic density through a warm color gradient. The UI stays responsive while the image grows increasingly detailed.

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
- `src/density.ts`: logarithmic density normalization and palette mapping
- `src/simulation.worker.ts`: high-volume simulation and `OffscreenCanvas` rendering
- `src/main.ts`: controls, statistics, resize handling, and export
- `worker/index.ts`: Cloudflare Worker health endpoint and static asset delegation

