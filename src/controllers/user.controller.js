const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const sendEmail = require('../utils/email');


/**
 * @desc    Register a new user
 * @route   POST /auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res, next) => {
  console.log("inside sign up")
  const { name, email, password } = req.body;

  // Check existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('Email already registered', 409);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Create user (unverified)
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    isVerified: false,
    verificationToken,
  });
  await newUser.save();

  console.log("user is created successfully", newUser)
  // Send verification email
  const verifyUrl = `http://localhost:5000/auth/verify-email?token=${verificationToken}`;
  console.log("verify url  : ", verifyUrl)
  const message = `
    <h1>Email Verification</h1>
    <p>Please click the link below to verify your email:</p>
    <a href="${verifyUrl}">${verifyUrl}</a>
  `;

  await sendEmail(email, 'Verify your email', message);

  res.status(201).json({
    status: 'success',
    message: 'User registered. Please check your email to verify your account.',
  });
});

/**
 * @desc    Authenticate user & get token
 * @route   POST /auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  console.log("inside login flow")
  const { email, password } = req.body;

  // 1. Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }
  
  if (!user.isVerified) {
    throw new AppError('Please verify your email before logging in', 401);
  }

  // 2. Compare passwords
  const isMatch = await bcrypt.compare(password, user.password || '');
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // 3. Generate JWT
  const token = generateToken(user);

  // 4. Response
  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    token,
  });
});

/**
 * @desc    Get logged-in user's profile
 * @route   GET /auth/profile
 * @access  Private
 */
const profile = asyncHandler(async (req, res, next) => {
  console.log("inside profile")
  // req.user comes from protect middleware
  const user = await User.findById(req.user.userId).select('-password -__v');
  if (!user) {
    throw new AppError('User not found', 204);
  }

  res.status(200).json({
    status: 'success',
    user
  });
});

/**
 * @desc    Verify email
 * @route   GET /auth/verify-email?token=xyz
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res, next) => {
  console.log("inside verification email")
  const { token } = req.query;

  const user = await User.findOne({ verificationToken: token });
  console.log("Verifying user:", user);
  if (!user) throw new AppError('Invalid or expired verification token', 400);

  user.isVerified = true;
  user.verificationToken = null;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully. You can now log in.',
  });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new AppError("No user found with that email", 204);

  // Generate raw token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Save hashed token in DB (security best practice)
  user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min validity
  await user.save({ validateBeforeSave: false });

  // Send email with RAW token (not hashed)
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await sendEmail(
    user.email,
    "Password Reset Request",
    `<p>Please click below to reset your password:</p>
     <a href="${resetUrl}">${resetUrl}</a>
     <p>This link is valid for 10 minutes only.</p>`
  );

  res.status(200).json({
    status: "success",
    message: "Password reset link sent to your email",
  });
});


const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  // Hash the token (to compare with DB)
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with matching hashed token & valid expiry
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) throw new AppError("Invalid or expired reset token", 400);

  // Update password
  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password has been reset successfully. You can now log in.",
  });
});




module.exports = {
  signup,
  login,
  profile,
  verifyEmail,
  forgotPassword,
  resetPassword
};