// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const protect = (req, res, next) => {
  let token;

  // 1. Check if token exists and starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized, no token', 401);
  }

  try {
    // 2. Verify token
    console.log("token is  : ", token)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded is  : ", decoded)

    // 3. Attach user data to req.user
    req.user = decoded; // { userId, email }
    next();
  } catch (err) {
    throw new AppError('Not authorized, token failed', 401);
  }
};

module.exports = protect;
