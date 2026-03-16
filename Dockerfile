FROM node:22 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.22 AS backend-build
WORKDIR /app/backend
COPY backend/go.* ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-build /app/frontend/build ./cmd/server/static/
RUN CGO_ENABLED=0 go build -o /server ./cmd/server

FROM gcr.io/distroless/static
COPY --from=backend-build /server /server
EXPOSE 8080
CMD ["/server"]
