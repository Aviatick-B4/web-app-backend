const router = require('express').Router();
const {
  createPaymentMidtrans,
  confirmPayment,
  validateFakePayment
} = require('../../controllers/payment.controller');
const { restrict } = require('../../middlewares/auth.middleware');

router.post('/midtrans/token/:bookingId', restrict, createPaymentMidtrans);
router.post('/midtrans/confirm', restrict, confirmPayment);
router.post('/payment/:bookingId', restrict, validateFakePayment);

module.exports = router