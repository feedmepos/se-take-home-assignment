# McDonald's Order Processing System

This application simulates McDonald's order processing system with automated cooking bots. It was developed as part of the FeedMe Software Engineer Take Home Assignment.

## Features

- Create normal and VIP orders with priority queuing
- Manage cooking bots that process orders
- Visual representation of pending and completed orders
- Real-time order status updates

## Requirements

- Node.js 14+ and npm
- Docker and Docker Compose (for containerized deployment)

## Running the Application

### Development Mode

1. Navigate to the project directory:

   ```
   cd app
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Using Docker

1. Navigate to the project directory:

   ```
   cd app
   ```

2. Build and start the Docker container:

   ```
   docker-compose up -d
   ```

3. Open your browser and navigate to `http://localhost`

## Testing

Run the unit tests with:

```
npm test
```

## Implementation Details

### Order Priority System

- Normal orders are placed at the end of the queue
- VIP orders are placed before all normal orders but after existing VIP orders
- Each order has a unique, incrementing ID

### Bot Management

- Each bot can process one order at a time
- Processing an order takes 10 seconds
- When a bot is added, it immediately starts processing pending orders
- When a bot is removed, any order it was processing returns to the pending queue
- Bots become idle when there are no orders to process

## Project Structure

- `src/components/OrderSystem.tsx`: Main component handling order and bot logic
- `src/styles/OrderSystem.css`: Styling for the order system
- `src/App.tsx`: Main application component
- `src/components/OrderSystem.test.tsx`: Unit tests for the order system

## Docker Configuration

- `Dockerfile`: Multi-stage build for production-ready container
- `nginx.conf`: Nginx configuration for serving the React app
- `docker-compose.yml`: Docker Compose configuration for easy deployment
