const { Router } = require('express');
const airline = require('../../controllers/airline.controller');
const upload = require('../../middlewares/upload.middleware');
const router = Router();
const { restrict } = require('../../middlewares/auth.middleware');

router.put('/:id/logo', restrict, upload.single('file'), airline.updateLogo);

module.exports = router;
