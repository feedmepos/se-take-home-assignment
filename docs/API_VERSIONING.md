# API Versioning Guide

## Overview

The McMocknald Order Kiosk API now supports versioning to enable backward compatibility and future API evolution. This document outlines the versioning strategy, available endpoints, and migration guidelines.

## Versioning Strategy

### Current Version: v1

The API follows URL-based versioning with the format: `/api/v{version}/{resource}`

- **Version prefix**: `/api/v1/`
- **Content negotiation**: Optionally supports `Accept` header versioning

### Supported Routes

#### API v1 Routes (Recommended)

All new integrations should use the versioned endpoints:

**Orders**
- `POST /api/v1/orders` - Create a new order
- `GET /api/v1/orders/:id` - Get order by ID
- `GET /api/v1/orders/stats` - Get order statistics

**Cooks**
- `POST /api/v1/cooks` - Create a new cook bot
- `GET /api/v1/cooks` - Get all cook bots
- `DELETE /api/v1/cooks/:id` - Remove a cook bot
- `POST /api/v1/cooks/:id/reinstate` - Reinstate a deleted cook bot
- `POST /api/v1/cooks/:id/accept` - Cook accepts an order

**Foods**
- `GET /api/v1/foods` - Get all food items (supports `?type=Food|Drink|Dessert` filter)
- `GET /api/v1/foods/:id` - Get food item by ID

## Request/Response Examples

### Versioned API (v1)

#### Create Order (v1)
```bash
# Request
POST /api/v1/orders
Content-Type: application/json

{
  "customer_id": 1,
  "food_ids": [1, 2, 3]
}

# Response (201 Created)
{
  "id": 100,
  "status": "PENDING",
  "ordered_by": 1,
  "customer_name": "John Doe",
  "customer_role": "VIP Customer",
  "created_at": "2025-10-24T10:30:00Z",
  "modified_at": "2025-10-24T10:30:00Z"
}
```

#### Get All Foods with Type Filter (v1)
```bash
# Request
GET /api/v1/foods?type=Drink

# Response (200 OK)
{
  "foods": [
    {
      "id": 3,
      "name": "Coke",
      "type": "Drink",
      "created_at": "2025-10-24T10:00:00Z",
      "modified_at": "2025-10-24T10:00:00Z"
    },
    {
      "id": 4,
      "name": "Sprite",
      "type": "Drink",
      "created_at": "2025-10-24T10:00:00Z",
      "modified_at": "2025-10-24T10:00:00Z"
    }
  ],
  "count": 2,
  "type": "Drink"
}
```

#### Accept Order (v1)
```bash
# Request
POST /api/v1/cooks/1/accept

# Response (200 OK)
{
  "id": 100,
  "status": "SERVING",
  "assigned_cook_user": 1,
  "ordered_by": 5,
  "customer_name": "VIP Customer",
  "customer_role": "VIP Customer",
  "created_at": "2025-10-24T10:30:00Z",
  "modified_at": "2025-10-24T10:31:00Z"
}
```

## Implementation Details

### Architecture

The API versioning is implemented using:

1. **Package structure**:
   ```
   internal/controller/
   ├── v1/
   │   ├── order_controller.go
   │   ├── cook_controller.go
   │   └── food_controller.go
   ```

2. **Routing strategy**: v1 controllers are registered in the Gin router

3. **Shared services**: Both versions use the same service layer, ensuring consistency

### Version Detection

Currently supports URL-based versioning. Future enhancements may include:

- `Accept` header: `Accept: application/vnd.mcmocknald.v1+json`
- Custom header: `API-Version: v1`

## Future Versions

When v2 is released:

1. **v1 routes**: Will remain available for backward compatibility
2. **v2 routes**: New features will be added to `/api/v2/` endpoints
3. **Deprecation**: v1 deprecation will be announced with "x" months notice before full removal
4. **Documentation**: This guide will be updated with v2 details

## Best Practices

1. **Always use versioned endpoints** for new integrations
2. **Include version in client libraries** to ensure compatibility
3. **Test against multiple versions** during development
4. **Monitor deprecation notices** in API responses
5. **Subscribe to API changelog** for version updates

## Support

For questions about API versioning:
- Email: api-support@mcmocknald.com
- Documentation: https://docs.mcmocknald.com/api/versioning
- Changelog: https://docs.mcmocknald.com/api/changelog
