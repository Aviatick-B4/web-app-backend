const express = require('express');
const router = express.Router();

const bookingController = require('../../controllers/booking.controllers');
router.post('/booking', bookingController.booking);
router.get('/booking-history', bookingController.getAll);
router.get('/booking-history/:bookingId', bookingController.getDetail);

module.exports = router;
