const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ticketRoutes = require('./ticket.routes');
const paymentRoutes = require("../v1/payment.routes");
const bookingRoutes = require('../v1/booking.routes');
const authRoutes = require('../v1/auth.routes')

const swaggerUI = require("swagger-ui-express");
const yaml = require("yaml");
const fs = require("fs");
const path = require("path");

const swagger_path = path.resolve(__dirname, "../../docs/v1.yaml");
const customCssUrl =
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css";
const customJs = [
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js",
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js",
];

const file = fs.readFileSync(swagger_path, "utf-8");

const swaggerDocument = yaml.parse(file);


router.use(
  "/api/v1/api-docs",
  swaggerUI.serve,
  swaggerUI.setup(swaggerDocument, { customCssUrl, customJs })
);


router.use('/api/v1/tickets', ticketRoutes);
router.use("/api/v1/payments", paymentRoutes);
router.use('/api/v1/bookings', bookingRoutes);
router.use('/api/v1/auth', authRoutes)

// Endpoint EJS View
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
