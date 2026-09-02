const User = require('../models/userModel');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class AuthService {
  async registerUser(data) {
    const { userId, studentId, facultyId, id, name, email, password, role = 'student' } = data;
    const resolvedId = userId || studentId || facultyId || id;

    if (!resolvedId || !name || !email || !password) {
      throw ApiError.badRequest('All fields (userId/ID, name, email, password) are required');
    }

    const trimmedId = String(resolvedId).trim();
    const trimmedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ userId: trimmedId }, { email: trimmedEmail }]
    });

    if (existingUser) {
      if (existingUser.userId === trimmedId) {
        throw ApiError.conflict("Account with ID '" + trimmedId + "' already exists");
      }
      if (existingUser.email === trimmedEmail) {
        throw ApiError.conflict("Account with email '" + trimmedEmail + "' already exists");
      }
    }

    const salt = User.generateSalt();
    const hashedPassword = User.hashPassword(password, salt);

    const user = new User({
      userId: trimmedId,
      name: String(name).trim(),
      email: trimmedEmail,
      password: hashedPassword,
      salt,
      role: role === 'teacher' ? 'teacher' : 'student'
    });

    await user.save();
    return user.toSafeObject();
  }

  async loginUser({ identifier, password, role }) {
    if (!identifier || !password) {
      throw ApiError.badRequest('Identifier (ID or Email) and password are required');
    }

    const trimmedIdentifier = String(identifier).trim();
    const isEmail = trimmedIdentifier.includes('@');

    const query = isEmail
      ? { email: trimmedIdentifier.toLowerCase() }
      : { userId: trimmedIdentifier };

    if (role) {
      query.role = role;
    }

    const user = await User.findOne(query);
    if (!user) {
      throw ApiError.unauthorized("Invalid credentials or account does not exist as " + (role || 'user'));
    }

    const isValid = user.verifyPassword(password);
    if (!isValid) {
      throw ApiError.unauthorized('Incorrect password or passcode');
    }

    return user.toSafeObject();
  }

  async forgotPassword({ identifier, role }) {
    if (!identifier) {
      throw ApiError.badRequest('Student ID, Faculty ID, or Email is required');
    }

    const trimmedIdentifier = String(identifier).trim();
    const isEmail = trimmedIdentifier.includes('@');

    const query = isEmail
      ? { email: trimmedIdentifier.toLowerCase() }
      : { userId: trimmedIdentifier };

    if (role) {
      query.role = role;
    }

    const user = await User.findOne(query);
    if (!user) {
      throw ApiError.notFound("No account found matching '" + trimmedIdentifier + "'");
    }

    // Generate 6-digit numeric reset token valid for 15 minutes
    const resetToken = String(Math.floor(100000 + Math.random() * 900000));
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    return {
      success: true,
      message: 'Password reset verification code generated',
      resetCode: resetToken,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }

  async resetPassword({ identifier, resetToken, newPassword }) {
    if (!identifier || !resetToken || !newPassword) {
      throw ApiError.badRequest('Identifier, reset code, and new password are required');
    }

    const trimmedIdentifier = String(identifier).trim();
    const isEmail = trimmedIdentifier.includes('@');

    const query = isEmail
      ? { email: trimmedIdentifier.toLowerCase() }
      : { userId: trimmedIdentifier };

    const user = await User.findOne(query);
    if (!user) {
      throw ApiError.notFound("No account found matching '" + trimmedIdentifier + "'");
    }

    if (!user.resetToken || user.resetToken !== String(resetToken).trim()) {
      throw ApiError.badRequest('Invalid or expired verification code');
    }

    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      throw ApiError.badRequest('Verification code has expired. Please request a new one.');
    }

    user.salt = User.generateSalt();
    user.password = User.hashPassword(newPassword, user.salt);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return {
      success: true,
      message: 'Password updated successfully! You can now sign in with your new credentials.',
      user: user.toSafeObject()
    };
  }

  async changePassword({ userId, currentPassword, newPassword }) {
    if (!userId || !currentPassword || !newPassword) {
      throw ApiError.badRequest('User ID, current password, and new password are required');
    }

    const user = await User.findOne({ userId: String(userId).trim() });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isValid = user.verifyPassword(currentPassword);
    if (!isValid) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    user.salt = User.generateSalt();
    user.password = User.hashPassword(newPassword, user.salt);
    await user.save();

    return {
      success: true,
      message: 'Password changed successfully',
      user: user.toSafeObject()
    };
  }

  async getUsersByRole(role) {
    const users = await User.find({ role }).sort({ createdAt: -1 }).lean();
    return users.map((u) => ({
      id: u.userId,
      userId: u.userId,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      createdAt: u.createdAt
    }));
  }

  async updateUserProfile(userId, updates) {
    const user = await User.findOne({ userId: String(userId).trim() });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (updates.name) user.name = String(updates.name).trim();
    if (updates.email) user.email = String(updates.email).trim().toLowerCase();
    if (updates.avatar) user.avatar = updates.avatar;

    if (updates.password) {
      user.salt = User.generateSalt();
      user.password = User.hashPassword(updates.password, user.salt);
    }

    await user.save();
    return user.toSafeObject();
  }

  async seedDefaultUsers() {
    try {
      const count = await User.countDocuments();
      if (count > 0) {
        logger.info("Users collection ready with " + count + " registered accounts.");
        return;
      }

      logger.info('🌱 Seeding initial student and faculty accounts in MongoDB...');

      const defaultStudents = [
        {
          userId: 'student_101',
          name: 'Aarav Sharma',
          email: 'aarav.sharma@example.edu',
          password: 'password123',
          role: 'student',
          avatar: '👨‍🎓'
        },
        {
          userId: 'student_105',
          name: 'Priya Patel',
          email: 'priya.patel@example.edu',
          password: 'password123',
          role: 'student',
          avatar: '👩‍🎓'
        },
        {
          userId: 'student_102',
          name: 'Rohan Verma',
          email: 'rohan.verma@example.edu',
          password: 'password123',
          role: 'student',
          avatar: '👨‍🎓'
        },
        {
          userId: 'student_103',
          name: 'Ananya Iyer',
          email: 'ananya.iyer@example.edu',
          password: 'password123',
          role: 'student',
          avatar: '👩‍🎓'
        }
      ];

      const defaultTeachers = [
        {
          userId: 'teacher_admin',
          name: 'Prof. Rajesh Menon',
          email: 'rajesh.menon@aptitudeacademy.edu',
          password: 'admin123',
          role: 'teacher',
          avatar: '👨‍🏫'
        },
        {
          userId: 'teacher_102',
          name: 'Dr. Sunita Rao',
          email: 'sunita.rao@aptitudeacademy.edu',
          password: 'admin123',
          role: 'teacher',
          avatar: '👩‍🏫'
        }
      ];

      for (const u of [...defaultStudents, ...defaultTeachers]) {
        const salt = User.generateSalt();
        const hashedPassword = User.hashPassword(u.password, salt);
        await User.create({
          userId: u.userId,
          name: u.name,
          email: u.email,
          password: hashedPassword,
          salt,
          role: u.role,
          avatar: u.avatar
        });
      }

      logger.info('✅ Default student & teacher accounts seeded successfully in MongoDB.');
    } catch (err) {
      logger.error('Error seeding default users:', err);
    }
  }
}

module.exports = new AuthService();
