# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install glibc compat for some prebuilt deps
RUN apk add --no-cache libc6-compat

# Install deps (use npm ci when lockfile present)
COPY package.json package-lock.json* ./
RUN npm ci || npm i --legacy-peer-deps

# Build
COPY . .
RUN npm run build

# Runtime stage: serve built assets with serve
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install serve globally
RUN npm i -g serve

# Copy built assets
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-S", "dist"]
