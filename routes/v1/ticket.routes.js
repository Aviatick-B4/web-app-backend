const { Router } = require('express');
const ticket = require('../../controllers/ticket.controller');
const router = Router();

router.get('/', ticket.getAll);
router.get('/:id', ticket.getById);
router.get('/search', ticket.search);

module.exports = router;
