import messages from '../config/messages';

/**
 * Generic error handler middleware
 * @param {Object} err The error parameter
 * @param {Object} req The request parameter
 * @param {Object} res The response parameter
 * @param {Object} next The middleware parameter
 * @returns The formatted response
 */
const errorHandler = (err: any, _req: any, res: any, _next: any) => {
  // TODO: logger seems to mutate the original error variable. See if we want to do something for it
  if (err instanceof Object) {
    console.error(err.toString());
  } else {
    console.error(err);
  }

  // Handle all JWT related errors
  if (err.name && (
    err.name === 'JsonWebTokenError'
    || err.name === 'TokenExpiredError'
    || err.name === 'NotBeforeError')) {
    return res.status(401).json({ errors: [messages.errors.tokenVerificationFailed] });
  }

  // Handle mongo errors and general db validation
  if (err.name && err.name === 'MongoError') {
    if (err.length && err.length > 0) {
      return res.status(400).json({ errors: [err] });
    }
    if (err.message) {
      return res.status(400).json({ errors: [err.toString()] });
    }
    return res.status(400).json({ errors: [JSON.stringify(err)] });
  }

  // Handle mongoose validation errors
  if (err.name && err.name === 'ValidationError') {
    return res.status(400).json({ errors: [err.message] });
  }

  // Handle the rest of the errors
  return res.status(500).json({ errors: [messages.errors.internalError] });
}

export default errorHandler;
