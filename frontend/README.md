# McDonald's Bot Order Simulator (Frontend)

Live Demo
URL: https://omar-mcd-bot-simulator-560af312bca7.herokuapp.com/

## Features
- Create Normal or VIP orders
- VIP orders prioritized (queued behind existing VIP, ahead of Normal)
- Add / remove cooking bots
- Each order processed exactly 10 seconds
- Real-time progress bar per bot
- Pending and Completed order sections

## Tech Stack
- React + TypeScript
- Vite build tool
- Deployed on Heroku (static build served via `serve`)

## Local Development
Requirements: Node.js 18+ (recommended 20)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open the app
# Vite default: http://localhost:5173
```

## Production Build
```bash
npm run build
# Output in dist/
```

Serve locally to verify production build:
```bash
npm install -g serve
serve -S dist
# Opens on http://localhost:3000 (or printed port)
```

## Docker
A Dockerfile is provided in `docker/`.
```bash
# From repository root
docker build -f frontend/docker/Dockerfile -t mcd-bot-frontend ./frontend

# Run container
docker run -p 3000:3000 mcd-bot-frontend
# App at http://localhost:3000
```

## Environment
No runtime env vars required. All state is in-memory and resets on reload.

## Project Scripts
- `npm run dev`: Start development server
- `npm run build`: Production build
- `npm run preview`: Preview production build locally

## Notes
- Removing a bot returns its in-progress order to Pending.
- Progress updates every 250ms while bots are processing.

## License
See root `LICENSE`.
