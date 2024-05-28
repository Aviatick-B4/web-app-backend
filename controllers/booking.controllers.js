const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
module.exports = {
  booking: async (req, res, next) => {
    try {
      const userId = req.body.userId || 1;

      const { flightId, adult, child, baby, seatClass, passenger } = req.body;

      if (!userId) {
        return res.status(400).json({
          status: false,
          message: "Can't find user with id " + userId,
          data: null,
        });
      }

      const totalPassengers = adult + child + baby;

      const result = await prisma.$transaction(async (prisma) => {
        const flight = await prisma.flight.findUnique({
          where: { id: flightId },
          include: {
            ticket: {
              where: { airplaneSeatClassId: seatClass },
            },
          },
        });

        if (!flight || flight.ticket.length === 0) {
          throw new Error('Flight or ticket not found');
        }

        const booking_code = crypto
          .randomBytes(5)
          .toString('hex')
          .toUpperCase();

        const total_price = flight.ticket[0].price * (totalPassengers - baby);
        const tax = Math.round(total_price * 0.1);
        const expiredPaid = new Date(Date.now() + 60 * 60 * 1000);

        const newBooking = await prisma.booking.create({
          data: {
            userId: userId,
            flightId: flightId,
            bookingCode: booking_code,
            expiredPaid: expiredPaid,
            totalPrice: total_price + tax,
            passenger: {
              create: passenger.map((p) => ({
                title: p.title,
                fullName: p.fullName,
                familyName: p.familyName,
                birthDate: p.birthDate,
                nationality: p.nationality,
                identityType: p.identityType,
                issuingCountry: p.issuingCountry,
                identityNumber: p.identityNumber,
                expiredDate: p.expiredDate,
                ageGroup: p.ageGroup,
              })),
            },
          },
          include: { passenger: true },
        });

        return {
          id: newBooking.id,
          flight_id: newBooking.flightId,
          booking_code: newBooking.bookingCode,
          seat_class: seatClass,
          total_passengers: totalPassengers,
          total_price: total_price + tax,
          tax: tax,
          status: newBooking.status,
          paid_before: newBooking.expiredPaid,
        };
      });

      await prisma.notification.create({
        data: {
          title: 'New Booking',
          message: `Successful in making a new booking, complete it before ${result.paid_before}`,
          userId: Number(req.body.userId),
          createdAt: new Date(Date.now()),
        },
      });

      return res.status(200).json({
        status: true,
        message: 'Success creating new Booking',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  getAll: async (req, res, next) => {
    try {
      const userId = req.body.userId || 2;

      if (!userId) {
        return res.status(400).json({
          status: false,
          message: "Can't find user with id " + userId,
          data: null,
        });
      }

      const bookings = await prisma.booking.findMany({
        where: { userId: userId },
        include: {
          flight: {
            include: {
              departureAirport: {
                select: {
                  city: true,
                },
              },
              arrivalAirport: {
                select: {
                  city: true,
                },
              },
            },
          },
        },
        orderBy: {
          flight: {
            departureTime: 'desc',
          },
        },
      });

      const result = await Promise.all(
        bookings.map(async (booking) => {
          let status = booking.status;
          const currentDate = new Date();

          if (status === 'UNPAID' && currentDate > booking.expiredPaid) {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { status: 'CANCELED' },
            });
            status = 'CANCELED';
          }

          return {
            id: booking.id,
            date: booking.flight.departureTime,
            status: status,
            booking_code: booking.bookingCode,
            seat_class: booking.seatClass,
            paid_before: booking.expiredPaid,
            price: booking.totalPrice,
            flight_detail: {
              departure_city: booking.flight.departureAirport.city.name,
              arrival_city: booking.flight.arrivalAirport.city.name,
              departure_time: booking.flight.departureTime,
              arrival_time: booking.flight.arrivalTime,
            },
          };
        })
      );

      return res.status(200).json({
        status: true,
        message: 'Success getting booking history',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  getDetail: async (req, res, next) => {
    try {
      const userId = req.body.userId || 2;

      const { bookingId } = req.params;

      if (!userId) {
        return res.status(400).json({
          status: false,
          message: "Can't find user with id " + userId,
          data: null,
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) },
        include: {
          flight: {
            include: {
              departureAirport: true,
              arrivalAirport: true,
            },
          },
          passenger: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          status: false,
          message: `Booking with id ${bookingId} not found`,
          data: null,
        });
      }

      const passengers = booking.passenger.map((passenger) => {
        return {
          title: passenger.title,
          fullname: passenger.fullName,
          ktp: passenger.identityNumber,
        };
      });

      const result = {
        id: booking.id,
        booking_code: booking.bookingCode,
        status: booking.status,
        paid_before: booking.expiredPaid,
        flight_detail: {
          departure_city: booking.flight.departureAirport.city,
          arrival_city: booking.flight.arrivalAirport.city,
          departure_time: booking.flight.departureTime,
          arrival_time: booking.flight.arrivalTime,
        },
        passengers: passengers,
        price_detail: {
          total_price: booking.totalPrice,
          tax: booking.tax,
        },
      };

      return res.status(200).json({
        status: true,
        message: 'Success getting booking detail',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
