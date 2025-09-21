const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const sendEmail = require('../utils/email');
const axios = require('axios');
const jwt = require("jsonwebtoken");
const providers = require('../../config/oauthProviders');
const { exchangeCodeForToken, getUserProfile } = require("../utils/oauthUtils");


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
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user)
  // 4. Response
  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  });
});

/**
 * @desc    Get logged-in user's profile
 * @route   GET /auth/profile
 * @access  Private
 */
const profile = asyncHandler(async (req, res, next) => {
  console.log("inside profile")
  console.log("req.user : ", req.user)
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
  console.log("inside verification email");
  const { token } = req.query;

  const user = await User.findOne({ verificationToken: token });
  console.log("Verifying user:", user);

  if (!user) {
    // invalid/expired token
    return res.redirect("http://localhost:3000?verified=failed");
  }

  if (user.isVerified) {
    // already verified
    return res.redirect("http://localhost:3000?verified=already");
  }

  user.isVerified = true;
  user.verificationToken = null;
  await user.save();

  // success case
  res.redirect("http://localhost:3000?verified=true");
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
  const resetUrl = `http://localhost:3000/?token=${resetToken}`;
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

const googleAuthController = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  if (!code) {
    res.status(400);
    throw new Error("Authorization code is required");
  }

  // 1. Exchange code for tokens
  const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", null, {
    params: {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    },
  });

  const { id_token, access_token } = tokenResponse.data;

  // 2. Decode user info from ID token
  const googleUser = jwt.decode(id_token);

  if (!googleUser || !googleUser.email) {
    res.status(400);
    throw new Error("Invalid Google token");
  }

  // 3. Find or create user in DB
  let user = await User.findOne({ email: googleUser.email });
  if (!user) {
    user = await User.create({
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.sub,
      avatar: googleUser.picture,
    });
  }

  // 4. Generate our JWTs
  const ourAccessToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const ourRefreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  // (Optional) Save refresh token in DB
  user.refreshToken = ourRefreshToken;
  await user.save();

  // 5. Respond with tokens + user info
  res.json({
    message: "Google login successful",
    accessToken: ourAccessToken,
    refreshToken: ourRefreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
});

const socialAuthController = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code } = req.body;

  if (!code) {
    res.status(400);
    throw new Error("Authorization code is required");
  }

  // 1. Load provider config
  const config = providers[provider];
  if (!config) {
    res.status(400);
    throw new Error("Unsupported provider");
  }

  // 2. Exchange code for tokens
  const tokens = await exchangeCodeForToken({
    ...config,
    code,
    provider,
  });

  // 3. Get normalized profile
  const profile = await getUserProfile(provider, tokens);

  if (!profile.email) {
    res.status(400);
    throw new Error(`${provider} did not return an email`);
  }

  // 4. Find or create user in DB
  let user = await User.findOne({ email: profile.email });
  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      [`${provider}Id`]: profile.id, // e.g. googleId, githubId
      avatar: profile.avatar,
    });
  }

  // 5. Issue our JWTs
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  user.refreshToken = refreshToken;
  await user.save();

  // 6. Respond with tokens only
  res.json({
    message: `${provider} login successful`,
    accessToken,
    refreshToken,
  });
});


const refreshTokenController = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError("Refresh token required", 401);
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError("Invalid or expired refresh token", 403);
  }

  // Find user
  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError("Invalid refresh token", 403);
  }

  // Issue new access token
  const newAccessToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.json({ accessToken: newAccessToken });
});


const logout = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = null; // invalidate refresh token
      await user.save();
    }
  }

  res.json({ message: "✅ Logged out successfully" });
});



module.exports = {
  signup,
  login,
  profile,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshTokenController,
  socialAuthController,
  logout
};