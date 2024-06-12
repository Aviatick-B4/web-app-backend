const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const convertToUTC = (date) => {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString();
};

module.exports = {
  booking: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader.split(' ')[1];

      if (!authHeader) {
        return res.status(401).json({
          status: 'error',
          message: 'No authorization token provided',
          data: null,
        });
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
          data: null,
        });
      }

      const { flightId, adult, child, baby, seatClass, passenger } = req.body;

      const totalPassengers = adult + child + baby;

      if (passenger.length !== totalPassengers) {
        return res.status(400).json({
          status: 'error',
          message:
            'Total number of passengers does not match the provided passenger details',
          data: null,
        });
      }

      const result = await prisma.$transaction(async (prisma) => {
        const flight = await prisma.flight.findUnique({
          where: { id: flightId },
          include: {
            ticket: {
              include: {
                airplaneSeatClass: true,
              },
            },
          },
        });

        if (!flight || flight.ticket.length === 0) {
          throw new Error('Flight or ticket not found');
        }

        const airplaneSeatClass = await prisma.airplaneSeatClass.findFirst({
          where: { type: seatClass },
        });

        if (!airplaneSeatClass) {
          throw new Error('Seat class not found');
        }

        const ticket = flight.ticket.find(
          (t) => t.airplaneSeatClass.type === seatClass
        );

        if (!ticket) {
          throw new Error('Ticket not found for the specified seat class');
        }

        const booking_code = crypto
          .randomBytes(5)
          .toString('hex')
          .toUpperCase();

        const total_price = ticket.price * (totalPassengers - baby);
        const tax = Math.round(total_price * 0.1);
        const expiredPaid = new Date(Date.now() + 15 * 60 * 1000);

        const newBooking = await prisma.booking.create({
          data: {
            userId: req.user.id,
            flightId: flightId,
            bookingCode: booking_code,
            expiredPaid: expiredPaid,
            totalPrice: total_price + tax,
            bookingTax: tax,
            createdAt: convertToUTC(new Date()),
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

        await prisma.flight.update({
          where: { id: flightId },
          data: { count: flight.count++ },
        });

        return {
          id: newBooking.id,
          flight_id: newBooking.flightId,
          booking_code: newBooking.bookingCode,
          seat_class: seatClass,
          total_passengers: totalPassengers,
          total_price: total_price + tax,
          bookingTax: tax,
          status: newBooking.status,
          paid_before: convertToUTC(newBooking.expiredPaid),
          created_at: newBooking.createdAt,
        };
      });

      await prisma.notification.create({
        data: {
          title: 'New Booking',
          message: `Successful in making a new booking, complete it before ${result.paid_before}`,
          type: 'transaction',
          userId: req.user.id,
          createdAt: new Date(Date.now()),
        },
      });

      const urlPayment = `${req.protocol}://${req.get('host')}/payment-form/${
        result.id
      }?token=${token}`;

      return res.status(200).json({
        status: true,
        message: 'Success creating new Booking',
        data: { ...result, urlPayment },
      });
    } catch (error) {
      next(error);
    }
  },

  getAll: async (req, res, next) => {
    try {
      const { id: userId } = req.user;
      const { search, date, status } = req.query;

      if (!userId) {
        return res.status(400).json({
          status: false,
          message: "Can't find user with id " + userId,
          data: null,
        });
      }

      let bookingFilter = { userId: userId };

      if (search) {
        bookingFilter.bookingCode = {
          contains: search,
          mode: 'insensitive',
        };
      }

      if (date) {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate)) {
          const nextDay = new Date(parsedDate);
          nextDay.setDate(parsedDate.getDate() + 1);

          bookingFilter.createdAt = {
            gte: parsedDate,
            lt: nextDay,
          };
        } else {
          return res.status(400).json({
            status: false,
            message: 'Invalid date format',
            data: null,
          });
        }
      }

      if (status) {
        bookingFilter.status = status.toUpperCase();
      }

      const bookings = await prisma.booking.findMany({
        where: bookingFilter,
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
            date: convertToUTC(booking.flight.departureTime),
            status: status,
            booking_code: booking.bookingCode,
            seat_class: booking.seatClass,
            paid_before: convertToUTC(booking.expiredPaid),
            price: booking.totalPrice,
            flight_detail: {
              departure_city: booking.flight.departureAirport.city.name,
              arrival_city: booking.flight.arrivalAirport.city.name,
              departure_time: convertToUTC(booking.flight.departureTime),
              arrival_time: convertToUTC(booking.flight.arrivalTime),
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
      const { id: userId } = req.user;

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
        paid_before: convertToUTC(booking.expiredPaid),
        flight_detail: {
          departure_city: booking.flight.departureAirport.city,
          arrival_city: booking.flight.arrivalAirport.city,
          departure_time: convertToUTC(booking.flight.departureTime),
          arrival_time: convertToUTC(booking.flight.arrivalTime),
        },
        passengers: passengers,
        price_detail: {
          total_price: booking.totalPrice,
          tax: booking.bookingTax,
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
