# syntax=docker/dockerfile:1
# Single-service image: NestJS serves the REST + SSE API AND the compiled React SPA
# from one origin. Container layout mirrors the repo so the backend's
# ServeStaticModule rootPath (join(__dirname,'..','..','frontend','dist')) resolves:
#   /app/backend/dist/main.js  ->  ../../frontend/dist  ->  /app/frontend/dist

# 1) Build the frontend (needs backend/src/contracts.ts for the @contracts alias)
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY backend/src/contracts.ts /app/backend/src/contracts.ts
COPY frontend/ ./
RUN npm run build            # tsc -b && vite build -> /app/frontend/dist

# 2) Build the backend (TypeScript -> dist via nest build)
FROM node:22-slim AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build            # nest build -> /app/backend/dist (main.js + cli/scenario.js)

# 3) Production dependencies only (no dev deps in the runtime image)
FROM node:22-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# 4) Runtime
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=backend-deps  /app/backend/node_modules  /app/backend/node_modules
COPY --from=backend-build /app/backend/dist          /app/backend/dist
COPY --from=backend-build /app/backend/package.json  /app/backend/package.json
COPY --from=frontend-build /app/frontend/dist        /app/frontend/dist
# node:slim ships a non-root 'node' user (uid 1000)
USER node
# Cloud Run injects $PORT (default 8080); main.ts reads process.env.PORT
EXPOSE 8080
CMD ["node", "dist/main.js"]
