const { Router } = require('express');
const auth = require('../../controllers/auth.controller.js.bak');
const router = Router();

router.post('/reset-password', auth.resetPassword);

module.exports = router;
