const { Router } = require('express');
const auth = require('../../controllers/auth.controller.js');
const router = Router();

router.post('/forgot-password', auth.sendResetPasswordEmail);
router.post('/reset-password', auth.resetPassword);

module.exports = router;
