const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const departmentPlugin = require('../plugins/departmentPlugin');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
    },

    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },

    rollNumber: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },

    semester: {
      type: Number,
      min: 1,
      max: 6,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    verificationOtpHash: {
      type: String,
      default: null,
    },

    verificationOtpExpiresAt: {
      type: Date,
      default: null,
    },

    verificationOtpAttempts: {
      type: Number,
      default: 0,
    },

    verificationOtpLastSentAt: {
      type: Date,
      default: null,
    },

    resetOtpHash: {
      type: String,
      default: null,
    },

    resetOtpExpiresAt: {
      type: Date,
      default: null,
    },

    resetOtpAttempts: {
      type: Number,
      default: 0,
    },

    resetOtpLastSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({
  department: 1,
  semester: 1,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.password;
  delete user.verificationOtpHash;
  delete user.verificationOtpExpiresAt;
  delete user.verificationOtpAttempts;
  delete user.verificationOtpLastSentAt;
  delete user.resetOtpHash;
  delete user.resetOtpExpiresAt;
  delete user.resetOtpAttempts;
  delete user.resetOtpLastSentAt;
  delete user.tokenVersion;
  delete user.__v;

  return user;
};

departmentPlugin(userSchema);

module.exports = mongoose.model('User', userSchema);
