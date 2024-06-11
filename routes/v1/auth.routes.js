const { Router } = require('express');
const passport = require('../../libs/passport');
const auth = require('../../controllers/auth.controller.js');
const router = Router();
const { restrict, isAdmin } = require('../../middlewares/auth.middleware');

router.post('/register', auth.register);
router.post('/verify-otp', auth.verifyOtp);
router.post('/resend-otp', auth.resendOtp);
router.delete('/users/:id', restrict, auth.deleteUser);

router.post('/login', auth.login);
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/google',
    session: false,
  }),
  auth.googleLogin
);

router.post('/forgot-password', auth.sendResetPasswordEmail);
router.post('/reset-password', auth.resetPassword);
router.get('/verified', restrict, auth.verified);
router.get('/users', restrict, isAdmin, auth.getAll);
router.get('/users/:id', restrict, auth.getUserById);
router.put('/users/profile', restrict, auth.updateUserProfile);

module.exports = router;
