# Golang Proof of Concept (Bonus)

This folder contains a minimal Golang proof-of-concept (PoC) that mirrors the **Node.js event-driven order controller** design from the main submission.

## What it demonstrates

- **Goroutines as bots (workers)** processing one order at a time
- **In-memory VIP priority queue** (VIP ahead of Normal, FIFO within each group)
- **Event-driven execution**: engine emits events and a simple renderer prints a simulation timeline and final summary

## Why this exists

FeedMe is migrating backend services from Node/NestJS to Go. This PoC shows how the same core concepts (worker model, priority scheduling, event emission) can map naturally to Go primitives (goroutines, channels, contexts).

## Non-goals

- Not part of the required assignment submission
- Does **not** affect GitHub Actions, CI, or `scripts/*.sh`
- No persistence, networking, or deployment

## Requirements

- Go 1.22+

## Run locally

```bash
cd golang/poc
go run .
```
