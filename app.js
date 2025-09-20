const express = require('express');
const userRoutes = require('./src/routes/user.routes');
const healthRoutes = require('./src/routes/health.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json());

// Routes
app.use('/auth', userRoutes);
app.use('/health', healthRoutes);

// Error handler (MUST be last)
app.use(errorHandler);

module.exports = app;
