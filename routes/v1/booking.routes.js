const router = require('express').Router();
const {
  booking,
  getAll,
  getDetail,
} = require('../../controllers/booking.controllers');

router.post('/new-booking', booking);
router.get('/booking-history', getAll);
router.get('/booking-history/:bookingId', getDetail);

module.exports = router;
