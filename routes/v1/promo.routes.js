const router = require('express').Router();
const {
  createPromo,
  getAll,
  UpdateTicketPromo,
} = require('../../controllers/promo.controller');
const { restrict, isAdmin } = require('../../middlewares/auth.middleware');

router.post('/', restrict, isAdmin, createPromo);
router.get('/', restrict, getAll);
router.put('/:ticketId', restrict, isAdmin, UpdateTicketPromo);

module.exports = router;
