# Add fullstack order controller

## Why
The repository currently contains only the assignment brief and placeholder scripts. We need a production-shaped prototype that demonstrates the business rules, supports CI verification, and showcases fullstack thinking for the target senior fullstack role.

## What Changes
- Add an OpenSpec change describing the shared domain core, CLI, API, and unified web console.
- Implement a TypeScript/Node.js workspace with one order controller core reused across all entrypoints.
- Deliver a Node CLI that supports scripted demo output and interactive commands.
- Deliver a Fastify API with SSE state updates for a React/Vite operator console.
- Add lightweight real-time metrics and documentation for local and deployed usage.

## Non-Goals
- Persistent storage, authentication, or multi-tenant support.
- Multi-instance coordination or distributed scheduling.
- Separate customer and manager applications.
