const { Router } = require('express');
const passport = require('../../libs/passport');
const auth = require('../../controllers/auth.controller.js');
const router = Router();

router.post('/login', auth.login);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
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

module.exports = router;
