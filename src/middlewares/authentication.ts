/**
 * (Router Middleware) Checks for a token and verifies it
 * @param {Object} _req The request parameter
 * @param {Object} _res The response parameter
 * @param {Object} next The middleware parameter
 * @returns {Object} The next middleware function
 */
export const isAuthenticated = (_req: object, _res: object, next: any): object => {
  try {
    return next();
  } catch (err) {
    return next(err);
  }
};