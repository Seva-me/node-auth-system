const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Auth API is healthy 🚀",
    timestamp: new Date(),
  });
});

module.exports = router;
