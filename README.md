# FeedMe take-home assessment (Backend, Node.js)

This McDonald's order controller backend is implemented in Node.js + Express.js. The base URL of the project is http://localhost:3000.

## Routes:

POST (/bots) - add a cooking bot \
DELETE (/bots) - delete a cooking bot

POST (/orders) - add an order (required to provide "type" field in JSON format, value can be either "VIP" or "Normal") \
GET (/orders) - get all orders (2 fields, "pending" and "complete", corresponding to pending and complete orders, each containing fields "id", "type" (normal vs VIP), "status" (pending vs complete) & "createdAt" (DateTime order was placed)) \
GET (/orders/summary) - get orders & bots summary, mainly used for printing final stats to console

## Implementation:

The backend is separated into two routes - /bots and /orders. Both routes use their own controllers which in turn use their own services - BotService and OrderService.

OrderService contains the data for orders & logic for creating, obtaining & returning orders. It contains pending and complete, 2 arrays which tracks order status. Order objects contain fields ID, type (normal vs VIP), status (pending vs complete) & DateTime created.

BotService contains the bots' data & logic for adding & removing bots and processing orders. It has a processing Map which maps bots to orders. Bot objects have 3 fields - ID, status (active vs idle) and a timeout reference which completes an order assigned to it after 10 seconds.

## Tests:

The test files botService.test.js & orderService.test.js in /tests are unit tests for the Service object implementations, whereas orderBotIntegration.test.js tests both OrderService and BotService together. These 3 files are implemented with Jest only. The file api.test.js tests the API endpoints using Supertest + Jest.

## Simulation:

The process for simulation which drives the resulting scripts/result.txt is mainly done in simulate.js, which uses axios to perform API calls.
