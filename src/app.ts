import express from 'express';
import router from './routes';
import errorHandler from './middlewares/errorHandler';

// Initialize the express framework
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Assign the routes to express
app.use(router);

// Import generic error handler
app.use(errorHandler);

export default app;
