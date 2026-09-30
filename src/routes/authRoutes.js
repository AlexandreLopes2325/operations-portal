const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');
const { validateRegister, validateLogin, validateResetPassword } = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { loginLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimit');

router.post('/register', authMiddleware, requirePermission('users', 'create'), validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, validateResetPassword, resetPassword);

module.exports = router;
