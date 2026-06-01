# McDonald Order Controller (Frontend Prototype)

Standalone frontend prototype for McDonald order-flow simulation:
- Normal and VIP order queues
- Bot-based processing (10 seconds per order)
- Dynamic add/remove bot behavior with queue priority preserved

## Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS

## Local Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
npm run preview
```

Build output is generated in the `dist/` folder.

## Deployment
This is a static frontend app, so deploy the `dist/` folder.

### Vercel
1. Import repository into Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.

### Netlify
1. Import repository into Netlify.
2. Build command: `npm run build`.
3. Publish directory: `dist`.

### GitHub Pages (optional)
1. Build with `npm run build`.
2. Publish `dist/` using a Pages action or deployment branch.
