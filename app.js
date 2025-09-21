const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./src/routes/auth.routes");
const healthRoutes = require("./src/routes/health.routes");
const errorHandler = require("./src/middleware/errorHandler");
const swaggerSpec = require("./config/swagger");

const app = express();

// -------------------- Middleware --------------------
app.use(cors({
  origin: ["http://localhost:3000", "http://10.250.11.27:3000"],
  credentials: true
}));
app.use(express.json());

// -------------------- Routes --------------------
app.use("/auth", authRoutes);         //  all auth APIs (signup, login, etc.)
app.use("/health", healthRoutes);     //  health check API
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec)); //  Swagger UI

// -------------------- Error Handler --------------------
app.use(errorHandler);

module.exports = app;
