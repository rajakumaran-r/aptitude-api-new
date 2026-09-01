const authService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.registerUser(req.body);
      return ApiResponse.success(res, 201, 'Account registered successfully in database', user);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const user = await authService.loginUser(req.body);
      return ApiResponse.success(res, 200, 'Authentication successful', user);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body);
      return ApiResponse.success(res, 200, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      return ApiResponse.success(res, 200, result.message, result.user);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const result = await authService.changePassword(req.body);
      return ApiResponse.success(res, 200, result.message, result.user);
    } catch (error) {
      next(error);
    }
  }

  async getStudents(req, res, next) {
    try {
      const students = await authService.getUsersByRole('student');
      return ApiResponse.success(res, 200, 'Students retrieved successfully', students);
    } catch (error) {
      next(error);
    }
  }

  async getTeachers(req, res, next) {
    try {
      const teachers = await authService.getUsersByRole('teacher');
      return ApiResponse.success(res, 200, 'Teachers retrieved successfully', teachers);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { userId } = req.body;
      const updated = await authService.updateUserProfile(userId, req.body);
      return ApiResponse.success(res, 200, 'Profile updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
