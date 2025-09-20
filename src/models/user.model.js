const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    minlength: 6,
    // optional, because Google login users won't have a password
  },

  googleId: {
    type: String,
    default: null,
  },

  avatar: {
    type: String,
    default: null, // store Google profile pic or user-uploaded avatar
  },

  isVerified: {
    type: Boolean,
    default: false, // becomes true after email verification
  },

  verificationToken: {
    type: String,
    default: null, // random string sent via email
  },

  // ✅ only one set for password reset
  passwordResetToken: {
    type: String,
    default: null,
  },

  passwordResetExpires: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
