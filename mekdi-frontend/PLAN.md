# Mekdi POS Vue.js Implementation Plan

A Vue.js 3 + TypeScript frontend for McDonald's automated cooking bot order management system, deployable to Vercel with Jest unit testing.

## Tech Stack

- **Framework**: Vue 3 with Composition API + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + shadcn-vue components
- **State Management**: Pinia (domain-driven stores)
- **Testing**: Jest + Vue Test Utils
- **Icons**: Lucide Vue
- **Deployment**: Vercel (SPA configuration)

## Architecture (Domain-Driven Design)

```
src/
├── domains/
│   └── order/
│       ├── entities/           # Order, Bot, OrderQueue
│       ├── services/           # OrderProcessingService
│       ├── stores/             # Pinia stores
│       └── types/              # TypeScript interfaces
├── components/
│   ├── ui/                     # shadcn-vue components
│   ├── order/
│   └── bot/
├── views/
│   └── OrderManagementView.vue
└── tests/
    └── unit/
```

## Key Entities

1. **Order**: id, type (NORMAL|VIP), status (PENDING|PROCESSING|COMPLETE), createdAt
2. **Bot**: id, status (IDLE|BUSY), currentOrderId?, processingTimeout?
3. **OrderQueue**: Priority queue maintaining VIP-first ordering within order types

## Implementation Steps

1. **Setup**: Initialize Vue 3 + Vite project with TypeScript
2. **Dependencies**: Install Tailwind, shadcn-vue, Pinia, Jest, Lucide
3. **Domain Layer**: Implement Order, Bot, OrderQueue entities
4. **Service Layer**: OrderProcessingService with 10s processing simulation
5. **Store Layer**: Pinia stores for reactive state management
6. **UI Components**: Buttons, Order cards, Bot indicators
7. **Main View**: OrderManagementView with PENDING/COMPLETE areas
8. **Unit Tests**: Entity logic, service methods, store actions
9. **Vercel Config**: spa-fallback for client-side routing

## SOLID Principles Applied

- **SRP**: Separate entities, services, stores, components
- **OCP**: Bot processing strategy can be extended
- **LSP**: Order types share interface, VIP behavior via composition
- **ISP**: Minimal interfaces for each domain role
- **DIP**: Services depend on abstractions, injected into stores

## Acceptance Criteria

- [x] New Normal Order → PENDING area
- [x] New VIP Order → PENDING, before Normal, after existing VIP
- [x] Unique increasing order numbers
- [x] + Bot creates bot, processes orders (10s), moves to COMPLETE
- [x] Idle bots wait for new orders
- [x] - Bot destroys newest, returns processing order to PENDING
- [x] All tests pass with Jest
- [x] Deployable to Vercel
