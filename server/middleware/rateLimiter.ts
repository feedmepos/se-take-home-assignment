import rateLimit from 'express-rate-limit';

// General API rate limiter: 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Don't rate limit SSE connections
    return req.path === '/api/events';
  },
});

// Strict rate limiter for order creation: 30 requests per minute
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: 'Too many orders created, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for bot operations: 20 requests per minute
export const botLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per minute
  message: 'Too many bot operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient rate limiter for state queries: 200 requests per minute
export const stateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per minute
  message: 'Too many state queries, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
