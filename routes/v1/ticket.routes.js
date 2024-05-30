const { Router } = require('express');
const ticket = require('../../controllers/ticket.controller');
const router = Router();

router.get('/', ticket.getAll);

module.exports = router;
