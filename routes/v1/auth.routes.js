const router = require('express').Router()
const {login,googleLogin} = require('../../controllers/auth.controller')
const passport = require('../../libs/passport')


router.post('/login', login)

// Google OAuth
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
  
    googleLogin
  );

module.exports = router