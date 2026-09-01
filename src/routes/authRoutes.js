const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authController.changePassword);
router.get('/students', authController.getStudents);
router.get('/teachers', authController.getTeachers);
router.put('/profile', authController.updateProfile);

module.exports = router;
