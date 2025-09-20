const express = require('express');
const { signup, login, profile, verifyEmail, forgotPassword, resetPassword } = require('../controllers/user.controller');
const { signupSchema, loginSchema } = require('../utils/user.validation');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/profile', authenticate, profile);
router.get('/verify-email', verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
