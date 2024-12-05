const router = require('express').Router();
const {
  createPaymentMidtrans,
  confirmPayment,
  createPaymentMidtransHandler
} = require('../../controllers/payment.controller');
const { restrict } = require('../../middlewares/auth.middleware');

router.post('/midtrans/confirm', confirmPayment);
router.post('/midtrans/:bookingId', restrict, createPaymentMidtransHandler);

module.exports = router