# --- build stage ---
FROM golang:1.23-alpine AS build
WORKDIR /src
# Cache modules first (no external deps, but keeps layers clean).
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/order-server ./cmd/server

# --- final stage ---
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /out/order-server /order-server
EXPOSE 8080
ENV PORT=8080
USER nonroot:nonroot
ENTRYPOINT ["/order-server"]
