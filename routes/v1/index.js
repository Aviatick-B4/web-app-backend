const express = require('express');
const router = express.Router();

const Booking = require('../v1/booking.routes');

router.use('/api/v1/bookings', Booking);

module.exports = router;
