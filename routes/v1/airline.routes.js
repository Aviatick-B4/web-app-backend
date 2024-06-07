const { Router } = require('express');
const airline = require('../../controllers/airline.controller');
const upload = require('../../middlewares/upload.middleware');
const router = Router();

router.put('/:id/logo', upload.single('file'), airline.updateLogo);

module.exports = router;
