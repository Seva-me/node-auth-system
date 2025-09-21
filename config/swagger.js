// config/swagger.js
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth System API",
      version: "1.0.0",
      description: "API documentation for Authentication System (Traditional + Social Login)",
    },
    servers: [
      {
        url: "http://localhost:5000", // adjust if deployed
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"], // adjust if routes path different
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
