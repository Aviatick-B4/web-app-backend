require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const midtransClient = require('midtrans-client');
const {
  PAYMENT_DEV_CLIENT_KEY,
  PAYMENT_DEV_SERVER_KEY,
  PAYMENT_PROD_CLIENT_KEY,
  PAYMENT_PROD_SERVER_KEY,
} = process.env;
const { CLIENT_BASE_URL } = process.env;

// Setting the environment (true for production, false for development)
const isProduction = false;

let snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: isProduction ? PAYMENT_PROD_SERVER_KEY : PAYMENT_DEV_SERVER_KEY,
  clientKey: isProduction ? PAYMENT_PROD_CLIENT_KEY : PAYMENT_DEV_CLIENT_KEY,
});

async function createPaymentMidtrans(bookingId, paymentMethod) {
  try {
    if (isNaN(bookingId)) {
      throw new Error('Invalid booking ID');
    }

    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }

    const checkBook = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        departureTicket: true,
        returnTicket: true,
        user: true,
      },
    });

    if (!checkBook) {
      throw new Error(`Booking Not Found With Id ${bookingId}`);
    }

    if (checkBook.status === 'PAID') {
      throw new Error('Booking has already been paid');
    }

    const parameter = {
      transaction_details: {
        order_id: `BOOKING with ID ${checkBook.id}-${Date.now()}`,
        gross_amount: checkBook.totalPrice,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: checkBook.user.fullName,
        email: checkBook.user.email,
        phone: checkBook.user.phoneNumber,
      },
      callbacks: {
        finish: `${CLIENT_BASE_URL}/success`,
        unfinish: `${CLIENT_BASE_URL}/riwayat-pemesanan`,
        cancel: `${CLIENT_BASE_URL}/error`,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { urlPayment: transaction.redirect_url },
    });

    return {
      status: true,
      message: 'Token retrieved successfully',
      data: transaction,
    };
  } catch (error) {
    console.error('Token creation failed:', error);
    throw new Error('Server error during token creation');
  }
}

module.exports = {
  createPaymentMidtrans,

  createPaymentMidtransHandler: async (req, res, next) => {
    try {
      const bookingId = Number(req.params.bookingId);
      const { paymentMethod } = req.body;
      const paymentResponse = await createPaymentMidtrans(
        bookingId,
        paymentMethod
      );
      res.status(200).json(paymentResponse);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message,
        data: null,
      });
    }
  },

  confirmPayment: async (req, res, next) => {
    let transactionResult;
    try {
      const {
        order_id,
        transaction_id,
        transaction_status,
        gross_amount,
        payment_type,
      } = req.body;
      transactionResult = await prisma.$transaction(async (prisma) => {
        if (
          transaction_status !== 'capture' &&
          transaction_status !== 'settlement'
        ) {
          if (transaction_status === 'expire' || transaction_status == "cancel" || transaction_status == "deny") {
            const parts = order_id.split('-');
            const bookingId = parts[0].split(' ')[3];
  
            if (!isNaN(bookingId)) {
              await prisma.booking.update({
                where: { id: Number(bookingId) },
                data: { status: 'CANCELED' },
              });
            }
  
            if (!res.headersSent) {
              return res.status(400).json({
                status: false,
                message: 'Transaction expired. Booking status updated to CANCEL.',
              });
            }
          }
  
          if (!res.headersSent) {
            return res.status(400).json({
              status: false,
              message:
                'Transaction is not successful. Status: ' + transaction_status,
            });
          }
        }
  
        const parts = order_id.split('-');
        if (parts.length < 2 || isNaN(parseInt(parts[1]))) {
          if (!res.headersSent) {
            return res.status(400).json({
              status: false,
              message: 'Invalid booking ID format',
            });
          }
        }
  
        const bookingId = parts[0].split(' ')[3];
  
        if (isNaN(bookingId)) {
          if (!res.headersSent) {
            return res.status(400).json({
              status: false,
              message: 'Invalid booking ID',
            });
          }
        }
  
        const newPayment = await prisma.payment.create({
          data: {
            name: payment_type,
            paidAt: new Date(),
            bookingId: Number(bookingId),
          },
        });
  
        const updatedBooking = await prisma.booking.update({
          where: { id: Number(bookingId) },
          data: { status: 'PAID' },
        });
  
        const notification = await prisma.notification.create({
          data: {
            title: 'Payment Successfully',
            message: `Payment for booking ID ${bookingId} has been successfully.`,
            type: 'transaction',
            userId: updatedBooking.userId,
            createdAt: new Date(),
          },
        });
  
        return {
          newPaymentId: newPayment.id,
          updatedBookingId: updatedBooking.id,
          notificationId: notification.id,
        };
      });
  
      if (transactionResult && !res.headersSent) {
        res.status(200).json({
          status: true,
          message: 'Payment confirmed and booking status updated successfully',
          data: {
            newPaymentId: transactionResult.newPaymentId,
            updatedBookingId: transactionResult.updatedBookingId,
          },
        });
      } else if (!res.headersSent) {
        res.status(500).json({
          status: false,
          message: 'Failed to save payment data and update booking status',
          data: null,
        });
      }
    } catch (error) {
      console.error('Error during payment confirmation:', error);
      if (!res.headersSent) {
        res.status(500).json({
          status: false,
          message: 'Server error during payment confirmation',
          data: null,
        });
      }
    }
  },
};
