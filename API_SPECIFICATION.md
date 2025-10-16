# McDonald's Order Management System - Web API Specification

## Base URL
- Local development: `http://localhost:8080`
- All endpoints return JSON responses

## API Endpoints

### 1. Dashboard

#### GET /api/dashboard
Get current system status

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingOrders": [1,2,3,4,5],
    "completedOrders": [20,22]
  }
}
```

### 2. Order Management

#### POST /api/orders
Create a new order

**Request Body:**
```json
{
  "type": "VIP" | "NORMAL"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1001
  }
}
```

### 3. Bot Management

#### GET /api/bots
Get all bots

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1
    },
    {
      "id": 2
    }
  ]
}
```

#### POST /api/bots
Add a new bot

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3
  }
}
```

#### DELETE /api/bots/{botId}
Remove a bot

**Response:**
```json
{
  "success": true
}
```
