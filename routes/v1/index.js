const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authRoutes = require('./auth.routes');
const ticketRoutes = require('./ticket.routes');
const paymentRoutes = require('./payment.routes');
const bookingRoutes = require('./booking.routes');
const cityRoutes = require('./city.routes');
const airlineRoutes = require('./airline.routes');
const promoRoutes = require('./promo.routes');
const notificationRoutes = require('./notification.routes');
const flightRoutes = require('./flight.routes');
const { addFlight } = require('../../services/cron_schedule_service');
const { updatePromoStatus } = require('../../controllers/promo.controller');
const { updateBookingStatus } = require('../../controllers/booking.controllers');

const swaggerUI = require('swagger-ui-express');
const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

const swagger_path = path.resolve(__dirname, '../../docs/v1.yaml');
const customCssUrl =
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css';
const customJs = [
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
];

const file = fs.readFileSync(swagger_path, 'utf-8');

const swaggerDocument = yaml.parse(file);

router.use(
  '/api/v1/api-docs',
  swaggerUI.serve,
  swaggerUI.setup(swaggerDocument, { customCssUrl, customJs })
);

router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/cities', cityRoutes);
router.use('/api/v1/tickets', ticketRoutes);
router.use('/api/v1/payments', paymentRoutes);
router.use('/api/v1/bookings', bookingRoutes);
router.use('/api/v1/airlines', airlineRoutes);
router.use('/api/v1/promos', promoRoutes);
router.use('/api/v1/notifications', notificationRoutes);
router.use('/api/v1/flights', flightRoutes);

// Endpoint Cron Job
router.post('/api/add-flight', async (req, res) => {
  try {
    await addFlight();
    res.status(200).send('Flight added successfully');
  } catch (error) {
    console.error('Failed to add flight:', error);
    res.status(500).send('Failed to add flight');
  }
});

router.post('/api/update-promo-status', async (req, res) => {
  try {
    await updatePromoStatus(req, res);
  } catch (error) {
    console.error('Failed to update promo status:', error);
    res.status(500).send('Failed to update promo status');
  }
});

router.post('/api/update-booking-status', async (req, res) => {
  try {
    await updateBookingStatus(req, res);
  } catch (error) {
    console.error('Failed to update booking status:', error);
    res.status(500).send('Failed to update booking status');
  }
});

// Endpoint EJS View
router.get('/reset-password', async (req, res) => {
  const { token } = req.query;
  res.render('resetPassword', { token });
});

module.exports = router;
