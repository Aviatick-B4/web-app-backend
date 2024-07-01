const router = require('express').Router();
const {
  createPaymentMidtrans,
  confirmPayment,
  validateFakePayment,
  createPaymentMidtransHandler
} = require('../../controllers/payment.controller');
const { restrict } = require('../../middlewares/auth.middleware');

router.post('/midtrans/confirm', confirmPayment);
router.post('/midtrans/token/:bookingId', restrict, createPaymentMidtransHandler);
router.post('/payment/:bookingId', restrict, validateFakePayment);

module.exports = router