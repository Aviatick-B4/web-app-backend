const router = require('express').Router();
const {
  booking,
  getAll,
  getDetail,
  prepareBooking,
  completeBooking,
} = require('../../controllers/booking.controllers');
const { restrict } = require('../../middlewares/auth.middleware');

router.post('/new-booking/:tripType', restrict, booking);
router.post('/prepare/:tripType', restrict, prepareBooking);
router.post('/complete', restrict, completeBooking);
router.get('/booking-history', restrict, getAll);
router.get('/booking-history/:bookingId', restrict, getDetail);

module.exports = router;
