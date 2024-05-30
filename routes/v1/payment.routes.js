const router = require('express').Router();
const {
  createPaymentMidtrans,
  confirmPayment,
  validateFakePayment
} = require('../../controllers/payment.controller');

router.post('/midtrans/token/:bookingId', createPaymentMidtrans);
router.post('/midtrans/confirm', confirmPayment);
router.post('/payment/:bookingId', validateFakePayment);

module.exports = router