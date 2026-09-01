const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * User Schema for Students and Teachers
 */
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    salt: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['student', 'teacher'],
      required: [true, 'Role must be student or teacher'],
      index: true
    },
    avatar: {
      type: String,
      default: function () {
        return this.role === 'teacher' ? '👨‍🏫' : '👨‍🎓';
      }
    },
    resetToken: {
      type: String,
      default: null
    },
    resetTokenExpiry: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.statics.hashPassword = function (password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

userSchema.statics.generateSalt = function () {
  return crypto.randomBytes(16).toString('hex');
};

userSchema.methods.verifyPassword = function (candidatePassword) {
  const hash = crypto.pbkdf2Sync(candidatePassword, this.salt, 10000, 64, 'sha512').toString('hex');
  return this.password === hash;
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this.userId,
    userId: this.userId,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

module.exports = User;
