const express = require("express");
const router = express.Router();
const Payment = require("../v1/payment.routes");

router.use("/api/v1/payments", Payment);

router.get('/payment-form/:bookingId', async (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        flight: true,
        user: true,
      },
    });
  
    if (!booking) {
      return res.status(404).send('Booking not found');
    }
  
    res.render('payment', {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      departureTime: booking.flight.departureTime,
      departureDate: booking.flight.departureDate,
      departureAirport: booking.flight.departureAirport,
      arrivalTime: booking.flight.arrivalTime,
      arrivalDate: booking.flight.arrivalDate,
      arrivalAirport: booking.flight.arrivalAirport,
      airline: booking.flight.airline,
      flightNumber: booking.flight.flightNumber,
      totalPrice: booking.totalPrice,
      adults: booking.adults,
      babies: booking.babies,
      tax: booking.tax,
    });
  });
  
  router.get('/payment-fake/:bookingId', async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).send('Invalid booking ID');
    }
  
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        flight: {
          include: {
            departureAirport: true,
            arrivalAirport: true,
          },
        },
        user: true,
      },
    });
  
    if (!booking) {
      return res.status(404).send('Booking not found');
    }
  
    res.render('fakePayment', {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      departureTime: booking.flight.departureTime,
      departureDate: booking.flight.departureTime.toDateString(),
      departureAirport: booking.flight.departureAirport.name,
      airline: booking.flight.flightNumber,
      flightNumber: booking.flight.flightNumber,
      arrivalTime: booking.flight.arrivalTime,
      arrivalDate: booking.flight.arrivalTime.toDateString(),
      arrivalAirport: booking.flight.arrivalAirport.name,
      totalPrice: booking.totalPrice,
      tax: 0, // Adjust as needed
    });
  });

module.exports = router;
