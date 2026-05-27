# FeedMe Order Controller

React frontend prototype for the McDonald's cooking bot order controller.

## Stack

- React + Vite
- TypeScript
- Tailwind CSS
- lucide-react
- Vitest + Testing Library
- Playwright
- pnpm

## Scripts

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
pnpm test:unit
pnpm test:e2e
pnpm test
```

## Structure

- `src/domain/`: pure scheduling logic, selectors, and view model helpers.
- `src/hooks/`: React orchestration for timers and state transitions.
- `src/components/`: presentational UI components.
- `src/**/*.test.ts(x)`: unit and component tests.
- `e2e/`: Playwright browser tests.
