const { Router } = require('express');
const city = require('../../controllers/city.controller');
const router = Router();

router.get('/', city.getAll);

module.exports = router;
