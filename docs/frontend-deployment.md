# Frontend Deployment Guide

## Local development

```bash
npm install
npm test
npm run dev
npm run build
```

## Frontend implementation notes

- Built with React + TypeScript + Vite
- All order and bot behavior is kept in memory on the client
- Processing time is 10 seconds per order
- Tests cover queue priority, bot add/remove behavior, and completion flow

## GitHub Pages deployment

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that builds and deploys the frontend to GitHub Pages.

### One-time GitHub setup

1. Push the repository to GitHub.
2. Open **Settings** → **Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Push to `main` or manually trigger the workflow.

### Expected site URL

```text
https://<your-github-username>.github.io/<repository-name>/
```

### Local Pages-style production build

To verify the asset base path locally before pushing:

```bash
VITE_BASE_PATH=/se-take-home-assignment/ npm run build
```

This generates a `dist/` directory whose asset paths are compatible with a project site hosted under `/<repository-name>/`.
