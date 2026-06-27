# Frontend Implementation (Vue 3)

**Branch:** `feat/vue-order-controller`  
**Live demo:** https://work-test-zeta.vercel.app

## Documentation

- [Requirements (Chinese)](./requirements.md)
- [Design (Chinese)](./design.md)

## Local setup

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run domain unit tests |

## Project structure

```text
src/
  domain/           # OrderController + Bot (no Vue)
  composables/      # useKitchen — UI bridge
  components/       # Vue panels
docs/               # requirements, design, this file
```

## Deploy (Vercel)

1. Import [xukaijie111/se-take-home-assignment](https://github.com/xukaijie111/se-take-home-assignment) on [vercel.com](https://vercel.com).
2. Build command: `npm run build`, output directory: `dist` (see `vercel.json` in repo root).
