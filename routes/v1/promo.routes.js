const router = require('express').Router();
const {createPromo, getAll, UpdateTicketPromo, updatePromoStatus} = require('../../controllers/promo.controller');

router.post('/', createPromo);
router.get('/', getAll);
router.put('/:ticketId', UpdateTicketPromo);

module.exports = router;

