/**
 * 404 handler — must come after all valid routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global error handler.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // FIX #9: multer errors are client errors (413 file too large, 400 otherwise)
  if (err.name === 'MulterError') {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Please upload a smaller file.'
        : `Upload error: ${err.message}`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }

  // JWT errors (handled in middleware but just in case)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }

  // Log the real error server-side (never sent to the client in production)
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${statusCode}: ${message}`, err.stack);
  }

  // FIX #11: in production, never leak the internal message of a 500
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && statusCode >= 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    // FIX #11: stack trace only in explicit development mode
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
