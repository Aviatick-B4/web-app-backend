const router = require('express').Router();
const {
  booking,
  getAll,
  getDetail,
} = require('../../controllers/booking.controllers');
const { restrict } = require('../../middlewares/auth.middleware');

router.post('/new-booking/:tripType', restrict, booking);
router.get('/booking-history', restrict, getAll);
router.get('/booking-history/:bookingId', restrict, getDetail);

module.exports = router;
