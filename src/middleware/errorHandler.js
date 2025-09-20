const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // If it's a known AppError (operational), send clean response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Unknown / unexpected error
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
};

module.exports = errorHandler;
