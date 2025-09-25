# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a McDonald's Order Controller system implementation for a take-home assignment. The project can be implemented as either a **frontend Next.js application** or a **backend Node.js CLI application**, focusing on automated cooking bot order processing.

## Core Requirements

### McDonald's Order Bot System
- **Order Types**: Normal customers and VIP members (VIP orders process first but queue behind existing VIP orders)
- **Bot Management**: Dynamic bot addition/removal with 10-second processing time per order
- **Order Flow**: PENDING → PROCESSING (10s) → COMPLETE
- **Memory-based**: No data persistence required

### Implementation Focus
**Frontend**: Interactive UI with real-time order/bot management

## Development Commands

### Next.js Frontend Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```


## Tech Stack

- **Framework**: Next.js 15.5.4 with App Router
- **React**: v19.1.0
- **TypeScript**: Full TypeScript support
- **Styling**: Tailwind CSS v4
- **Build**: Turbopack enabled for faster development
- **Fonts**: Geist Sans and Geist Mono

## Project Structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout with Geist fonts
│   ├── page.tsx        # Main page (currently default Next.js)
│   └── globals.css     # Global styles
```

## Assignment Submission Requirements

- Deploy to publicly accessible URL
- Implement all order management features in UI
- Allow real-time interaction with order/bot system

## Key Features to Implement

1. **Order Creation**: "New Normal Order" and "New VIP Order" buttons
2. **Order Queuing**: VIP priority with proper queue management
3. **Bot Management**: "+ Bot" and "- Bot" controls
4. **Processing Logic**: 10-second order processing with status updates
5. **Order States**: PENDING, PROCESSING, COMPLETE areas/states
6. **Unique Order Numbers**: Incrementing order identification

## Development Notes

- Default dev server runs on http://localhost:3000
- Uses Geist font family for consistent typography
- Turbopack enabled for faster builds and hot reload
- Currently shows default Next.js starter page - needs replacement with order controller UIc

## React Best Practices

Of course. Here are the key principles and patterns for a React state management "code schema," stripped down to the most essential points and actionable code examples.

### 1. Core Anti-Patterns (What to Avoid)

#### A. Don't derive state in useEffect
If a value can be calculated from existing state or props, calculate it directly during render.

```javascript
// ❌ Anti-Pattern
const [total, setTotal] = useState(0);
useEffect(() => {
  setTotal(orders.reduce((acc, o) => acc + o.price, 0));
}, [orders]);

// ✅ Best Practice: Derive directly
const total = orders.reduce((acc, o) => acc + o.price, 0);
```

#### B. Don't store redundant/duplicate state
Store the minimum information needed (like an ID) and derive the rest from a single source of truth.

```javascript
// ❌ Anti-Pattern: Storing the full object can lead to stale data.
const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

// ✅ Best Practice: Store only the ID.
const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
const selectedHotel = hotels.find(h => h.id === selectedHotelId); // Always up-to-date
```

#### C. Don't use useState for non-rendering values
If changing a value shouldn't trigger a re-render (e.g., timer IDs, library instances), use useRef.

```javascript
// ❌ Anti-Pattern: Causes unnecessary re-renders.
const [timerId, setTimerId] = useState(null);

// ✅ Best Practice: No re-renders on change.
const timerIdRef = useRef<NodeJS.Timeout | null>(null);
timerIdRef.current = setTimeout(...);
```

### 2. The Core Pattern: State Machines with useReducer

#### A. Make impossible states unrepresentable
Replace multiple boolean flags (isLoading, isError) with a single status string to create a Finite State Machine.

```javascript
// ❌ Anti-Pattern: Allows for impossible states like (isLoading: true, isError: true)
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);

// ✅ Best Practice: A component can only be in one state at a time.
type Status = 'idle' | 'loading' | 'success' | 'error';
const [status, setStatus] = useState<Status>('idle');
```

#### B. Centralize logic in a pure reducer function
A reducer takes the current state and an action, and returns the next state. It's the single place where all state transitions are defined.
Signature: (currentState, action) => newState

```typescript
// 1. Define State and Actions
interface State {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: User[] | null;
  error: string | null;
}
type Action =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; payload: User[] }
  | { type: 'FETCH_FAILURE'; payload: string };

// 2. Create the Reducer
function fetchReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH':
      return { ...state, status: 'loading', error: null };
    case 'FETCH_SUCCESS':
      return { ...state, status: 'success', data: action.payload };
    case 'FETCH_FAILURE':
      return { ...state, status: 'error', error: action.payload, data: null };
    default:
      return state;
  }
}

// 3. Use in Component
const [state, dispatch] = useReducer(fetchReducer, {
  status: 'idle',
  data: null,
  error: null,
});
```

#### C. Drive side effects from state changes
Use a single useEffect that listens to the status of your state machine to declaratively handle side effects like API calls.

```javascript
useEffect(() => {
  if (state.status === 'loading') {
    api.get('/users')
      .then(res => dispatch({ type: 'FETCH_SUCCESS', payload: res.data }))
      .catch(err => dispatch({ type: 'FETCH_FAILURE', payload: err.message }));
  }
}, [state.status]); // Dependency array is simple and robust.
```

### 3. Fundamental Principles

#### A. Immutability
Never mutate state directly. Always create new objects and arrays.

```javascript
// ❌ Anti-Pattern: Mutation
state.user.permissions.push('write');

// ✅ Best Practice: Create new copies
return {
  ...state,
  user: {
    ...state.user,
    permissions: [...state.user.permissions, 'write'],
  },
};
```

#### B. Data Normalization
For complex, nested data, flatten it like a database to simplify updates and improve performance.

```javascript
// ❌ Anti-Pattern: Deeply nested state is hard to update.
const post = { id: 'p1', comments: [{ id: 'c1', text: '...' }] };

// ✅ Best Practice: Flat state is easy to update.
const state = {
  posts: { 'p1': { id: 'p1', comments: ['c1'] } },
  comments: { 'c1': { id: 'c1', text: '...' } },
};
```

#### C. Type-Safe States (Discriminated Unions)
Use TypeScript to link state properties to the status, making invalid data combinations a compile-time error.

```typescript
// ✅ Best Practice: Guarantees data integrity.
type ComponentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] } // `data` MUST exist in 'success' state
  | { status: 'error'; error: string };  // `error` MUST exist in 'error' state
```
