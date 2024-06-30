const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const { convertDate } = require('../utils/formatedDate');

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

      const { tripType } = req.params;
      const validTripTypes = ['roundtrip', 'singletrip'];

      if (!validTripTypes.includes(tripType)) {
        return res.status(400).json({
          status: 'error',
          message:
            'Invalid trip type. Only "roundtrip" and "singletrip" are allowed.',
          data: null,
        });
      }

      const {
        departureTicketId,
        returnTicketId,
        adult,
        child,
        baby,
        passenger,
        donation,
      } = req.body;

      if (
        departureTicketId == null ||
        (tripType === 'roundtrip' && returnTicketId == null) ||
        adult == null ||
        child == null ||
        baby == null ||
        !Array.isArray(passenger)
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'All fields are required in the request body',
          data: null,
        });
      }

      if (passenger.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Passenger details cannot be empty',
          data: null,
        });
      }

      const requiredPassengerFields = [
        'title',
        'fullName',
        'familyName',
        'birthDate',
        'nationality',
        'identityType',
        'issuingCountry',
        'identityNumber',
        'expiredDate',
        'ageGroup',
      ];

      for (let i = 0; i < passenger.length; i++) {
        const p = passenger[i];
        for (const field of requiredPassengerFields) {
          if (!p[field]) {
            return res.status(400).json({
              status: 'error',
              message: `Field ${field} is required for each passenger`,
              data: null,
            });
          }
        }
      }

      const totalPassengers = adult + child + baby;

      if (passenger.length !== totalPassengers) {
        return res.status(400).json({
          status: 'error',
          message:
            'Total number of passengers does not match the provided passenger details',
          data: null,
        });
      }

      const isRoundTrip = tripType === 'roundtrip';

      if (isRoundTrip && !returnTicketId) {
        return res.status(400).json({
          status: 'error',
          message: 'Return ticket is required for round trip booking',
          data: null,
        });
      }

      const departureFlightPromise = prisma.ticket.findUnique({
        where: { id: departureTicketId },
        include: {
          flight: {
            include: {
              departureAirport: true,
              arrivalAirport: true,
            },
          },
          airplaneSeatClass: true,
        },
      });

      const returnFlightPromise = isRoundTrip
        ? prisma.ticket.findUnique({
            where: { id: returnTicketId },
            include: {
              flight: {
                include: {
                  departureAirport: true,
                  arrivalAirport: true,
                },
              },
              airplaneSeatClass: true,
            },
          })
        : Promise.resolve(null);

      const [departureFlight, returnFlight] = await Promise.all([
        departureFlightPromise,
        returnFlightPromise,
      ]);

      if (!departureFlight) {
        return res.status(400).json({
          status: 'error',
          message: 'Departure flight not found',
          data: null,
        });
      }

      if (isRoundTrip && !returnFlight) {
        return res.status(400).json({
          status: 'error',
          message: 'Return flight not found',
          data: null,
        });
      }

      if (
        isRoundTrip &&
        (departureFlight.flight.departureAirport.id !==
          returnFlight.flight.arrivalAirport.id ||
          departureFlight.flight.arrivalAirport.id !==
            returnFlight.flight.departureAirport.id)
      ) {
        return res.status(400).json({
          status: 'error',
          message:
            'Invalid round trip. Departure and return flights do not match.',
          data: null,
        });
      }

      const booking_code = crypto.randomBytes(5).toString('hex').toUpperCase();

      const departureTicketPrice =
        departureFlight.price * (totalPassengers - baby);
      const returnTicketPrice = isRoundTrip
        ? returnFlight.price * (totalPassengers - baby)
        : 0;
      const total_price = departureTicketPrice + returnTicketPrice;
      const tax = Math.round(total_price * 0.1);
      const donation_amount = donation ? 1000 : 0;
      const expiredPaid = new Date(Date.now() + 15 * 60 * 1000);

      const newBooking = await prisma.booking.create({
        data: {
          userId: req.user.id,
          departureTicketId: departureTicketId,
          returnTicketId: isRoundTrip ? returnTicketId : null,
          bookingCode: booking_code,
          expiredPaid: convertDate(expiredPaid),
          totalPrice: total_price + tax + donation_amount,
          bookingTax: tax,
          donation: donation_amount,
          createdAt: convertDate(new Date()),
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
        where: { id: departureFlight.flight.id },
        data: { count: departureFlight.flight.count + 1 },
      });

      if (isRoundTrip) {
        await prisma.flight.update({
          where: { id: returnFlight.flight.id },
          data: { count: returnFlight.flight.count + 1 },
        });

        await prisma.booking.update({
          where: { id: newBooking.id },
          data: { isRoundTrip: true },
        });
      }

      const result = {
        id: newBooking.id,
        departureTicketId: newBooking.departureTicketId,
        returnTicketId: newBooking.returnTicketId,
        booking_code: newBooking.bookingCode,
        total_passengers: totalPassengers,
        total_price: newBooking.totalPrice,
        bookingTax: newBooking.bookingTax,
        donation: newBooking.donation,
        status: newBooking.status,
        departureFlight: {
          flightNumber: departureFlight.flight.flightNumber,
          departureTime: departureFlight.flight.departureTime,
          arrivalTime: departureFlight.flight.arrivalTime,
          departureAirport: departureFlight.flight.departureAirport.name,
          arrivalAirport: departureFlight.flight.arrivalAirport.name,
          seatClass: departureFlight.airplaneSeatClass.type,
          price: departureFlight.price,
        },
        returnFlight: isRoundTrip
          ? {
              flightNumber: returnFlight.flight.flightNumber,
              departureTime: returnFlight.flight.departureTime,
              arrivalTime: returnFlight.flight.arrivalTime,
              departureAirport: returnFlight.flight.departureAirport.name,
              arrivalAirport: returnFlight.flight.arrivalAirport.name,
              seatClass: returnFlight.airplaneSeatClass.type,
              price: returnFlight.price,
            }
          : null,
        paid_before: newBooking.expiredPaid,
        created_at: newBooking.createdAt,
      };

      await prisma.notification.create({
        data: {
          title: 'New Booking',
          message: `Successful in making a new booking, complete it before ${result.paid_before}`,
          type: 'transaction',
          userId: req.user.id,
          createdAt: convertDate(new Date()),
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

  prepareBooking: async (req, res, next) => {
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

      const { tripType } = req.params;
      const validTripTypes = ['roundtrip', 'singletrip'];

      if (!validTripTypes.includes(tripType)) {
        return res.status(400).json({
          status: 'error',
          message:
            'Invalid trip type. Only "roundtrip" and "singletrip" are allowed.',
          data: null,
        });
      }

      const {
        departureTicketId,
        returnTicketId,
        adult,
        child,
        baby,
        passenger,
        donation,
      } = req.body;

      const totalPassengers = adult + child + baby;

      if (passenger.length !== totalPassengers) {
        return res.status(400).json({
          status: 'error',
          message:
            'Total number of passengers does not match the provided passenger details',
          data: null,
        });
      }

      const isRoundTrip = tripType === 'roundtrip';

      if (isRoundTrip && !returnTicketId) {
        return res.status(400).json({
          status: 'error',
          message: 'Return ticket is required for round trip booking',
          data: null,
        });
      }

      const departureFlightPromise = prisma.ticket.findUnique({
        where: { id: departureTicketId },
        include: {
          flight: {
            include: {
              departureAirport: true,
              arrivalAirport: true,
            },
          },
          airplaneSeatClass: true,
        },
      });

      const returnFlightPromise = isRoundTrip
        ? prisma.ticket.findUnique({
            where: { id: returnTicketId },
            include: {
              flight: {
                include: {
                  departureAirport: true,
                  arrivalAirport: true,
                },
              },
              airplaneSeatClass: true,
            },
          })
        : Promise.resolve(null);

      const [departureFlight, returnFlight] = await Promise.all([
        departureFlightPromise,
        returnFlightPromise,
      ]);

      if (!departureFlight) {
        return res.status(400).json({
          status: 'error',
          message: 'Departure flight not found',
          data: null,
        });
      }

      if (isRoundTrip && !returnFlight) {
        return res.status(400).json({
          status: 'error',
          message: 'Return flight not found',
          data: null,
        });
      }

      if (
        isRoundTrip &&
        (departureFlight.flight.departureAirport.id !==
          returnFlight.flight.arrivalAirport.id ||
          departureFlight.flight.arrivalAirport.id !==
            returnFlight.flight.departureAirport.id)
      ) {
        return res.status(400).json({
          status: 'error',
          message:
            'Invalid round trip. Departure and return flights do not match.',
          data: null,
        });
      }

      const booking_code = crypto.randomBytes(5).toString('hex').toUpperCase();

      const departureTicketPrice =
        departureFlight.price * (totalPassengers - baby);
      const returnTicketPrice = isRoundTrip
        ? returnFlight.price * (totalPassengers - baby)
        : 0;
      const total_price = departureTicketPrice + returnTicketPrice;
      const tax = Math.round(total_price * 0.1);
      const donation_amount = donation ? 1000 : 0;
      const expiredPaid = new Date(Date.now() + 15 * 60 * 1000);

      const preparedData = {
        userId: req.user.id,
        departureTicketId,
        returnTicketId: isRoundTrip ? returnTicketId : null,
        bookingCode: booking_code,
        expiredPaid: convertDate(expiredPaid),
        totalPrice: total_price + tax + donation_amount,
        bookingTax: tax,
        donation: donation_amount,
        createdAt: convertDate(new Date()),
        passenger,
        isRoundTrip,
        departureFlight,
        returnFlight,
      };

      return res.status(200).json({
        status: true,
        message: 'Booking data prepared successfully',
        data: preparedData,
      });
    } catch (error) {
      next(error);
    }
  },

  completeBooking: async (req, res, next) => {
    try {
      const {
        userId,
        departureTicketId,
        returnTicketId,
        bookingCode,
        expiredPaid,
        totalPrice,
        bookingTax,
        donation,
        createdAt,
        passenger,
        isRoundTrip,
        departureFlight,
        returnFlight,
      } = req.body;

      const newBooking = await prisma.booking.create({
        data: {
          userId,
          departureTicketId,
          returnTicketId,
          bookingCode,
          expiredPaid,
          totalPrice,
          bookingTax,
          donation,
          createdAt,
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
        where: { id: departureFlight.flight.id },
        data: { count: departureFlight.flight.count + 1 },
      });

      if (isRoundTrip) {
        await prisma.flight.update({
          where: { id: returnFlight.flight.id },
          data: { count: returnFlight.flight.count + 1 },
        });

        await prisma.booking.update({
          where: { id: newBooking.id },
          data: { isRoundTrip: true },
        });
      }

      const result = {
        id: newBooking.id,
        departureTicketId: newBooking.departureTicketId,
        returnTicketId: newBooking.returnTicketId,
        booking_code: newBooking.bookingCode,
        total_passengers: passenger.length,
        total_price: newBooking.totalPrice,
        bookingTax: newBooking.bookingTax,
        donation: newBooking.donation,
        status: newBooking.status,
        departureFlight: {
          flightNumber: departureFlight.flight.flightNumber,
          departureTime: departureFlight.flight.departureTime,
          arrivalTime: departureFlight.flight.arrivalTime,
          departureAirport: departureFlight.flight.departureAirport.name,
          arrivalAirport: departureFlight.flight.arrivalAirport.name,
          seatClass: departureFlight.airplaneSeatClass.type,
          price: departureFlight.price,
        },
        returnFlight: isRoundTrip
          ? {
              flightNumber: returnFlight.flight.flightNumber,
              departureTime: returnFlight.flight.departureTime,
              arrivalTime: returnFlight.flight.arrivalTime,
              departureAirport: returnFlight.flight.departureAirport.name,
              arrivalAirport: returnFlight.flight.arrivalAirport.name,
              seatClass: returnFlight.airplaneSeatClass.type,
              price: returnFlight.price,
            }
          : null,
        paid_before: newBooking.expiredPaid,
        created_at: newBooking.createdAt,
      };

      await prisma.notification.create({
        data: {
          title: 'New Booking',
          message: `Successful in making a new booking, complete it before ${result.paid_before}`,
          type: 'transaction',
          userId: userId,
          createdAt: convertDate(new Date()),
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
          departureTicket: {
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
          },
          returnTicket: {
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
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const result = await Promise.all(
        bookings.map(async (booking) => {
          let bookingStatus = booking.status;
          const currentDate = new Date();

          if (bookingStatus === 'UNPAID' && currentDate > booking.expiredPaid) {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { status: 'CANCELED' },
            });
            bookingStatus = 'CANCELED';
          }

          return {
            id: booking.id,
            date: booking.departureTicket.flight.departureTime,
            status: bookingStatus,
            booking_code: booking.bookingCode,
            paid_before: booking.expiredPaid,
            createdAt: booking.createdAt,
            price: booking.totalPrice,
            flight_detail: {
              departure_city:
                booking.departureTicket.flight.departureAirport.city.name,
              arrival_city:
                booking.departureTicket.flight.arrivalAirport.city.name,
              departure_time: booking.departureTicket.flight.departureTime,
              arrival_time: booking.departureTicket.flight.arrivalTime,
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
        select: {
          id: true,
          bookingCode: true,
          status: true,
          expiredPaid: true,
          createdAt: true,
          totalPrice: true,
          bookingTax: true,
          donation: true,
          urlPayment: true,
          departureTicket: {
            select: {
              flight: {
                select: {
                  flightNumber: true,
                  departureTime: true,
                  arrivalTime: true,
                  departureAirport: {
                    select: {
                      name: true,
                      city: {
                        select: {
                          name: true,
                          cityIata: true,
                        },
                      },
                    },
                  },
                  arrivalAirport: {
                    select: {
                      name: true,
                      city: {
                        select: {
                          name: true,
                          cityIata: true,
                        },
                      },
                    },
                  },
                },
              },
              airplaneSeatClass: {
                select: {
                  type: true,
                  airplane: {
                    select: {
                      inFlightFacility: true,
                      airline: {
                        select: {
                          name: true,
                          logoUrl: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          returnTicket: {
            select: {
              flight: {
                select: {
                  flightNumber: true,
                  departureTime: true,
                  arrivalTime: true,
                  departureAirport: {
                    select: {
                      name: true,
                      city: {
                        select: {
                          name: true,
                          cityIata: true,
                        },
                      },
                    },
                  },
                  arrivalAirport: {
                    select: {
                      name: true,
                      city: {
                        select: {
                          name: true,
                          cityIata: true,
                        },
                      },
                    },
                  },
                },
              },
              airplaneSeatClass: {
                select: {
                  type: true,
                  airplane: {
                    select: {
                      inFlightFacility: true,
                      airline: {
                        select: {
                          name: true,
                          logoUrl: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          passenger: {
            select: {
              title: true,
              fullName: true,
              identityNumber: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          status: false,
          message: `Booking with id ${bookingId} not found`,
          data: null,
        });
      }

      const passengers = booking.passenger.map((passenger) => ({
        title: passenger.title,
        fullname: passenger.fullName,
        ktp: passenger.identityNumber,
      }));

      const result = {
        id: booking.id,
        booking_code: booking.bookingCode,
        status: booking.status,
        paid_before: booking.expiredPaid,
        createdAt: booking.createdAt,
        flight_detail: {
          departure_flight: {
            flightNumber: booking.departureTicket.flight.flightNumber,
            departure_city:
              booking.departureTicket.flight.departureAirport.city.name,
            departure_city_iata:
              booking.departureTicket.flight.departureAirport.city.cityIata,
            arrival_city:
              booking.departureTicket.flight.arrivalAirport.city.name,
            arrival_city_iata:
              booking.departureTicket.flight.arrivalAirport.city.cityIata,
            departure_time: booking.departureTicket.flight.departureTime,
            arrival_time: booking.departureTicket.flight.arrivalTime,
            airline: {
              name: booking.departureTicket.airplaneSeatClass.airplane.airline
                .name,
              logo_url:
                booking.departureTicket.airplaneSeatClass.airplane.airline
                  .logoUrl,
            },
            in_flight_facility:
              booking.departureTicket.airplaneSeatClass.airplane
                .inFlightFacility,
            seat_class: booking.departureTicket.airplaneSeatClass.type,
            airport: {
              departure: booking.departureTicket.flight.departureAirport.name,
              arrival: booking.departureTicket.flight.arrivalAirport.name,
            },
          },
          return_flight: booking.returnTicket
            ? {
                flightNumber: booking.returnTicket.flight.flightNumber,
                departure_city:
                  booking.returnTicket.flight.departureAirport.city.name,
                departure_city_iata:
                  booking.returnTicket.flight.departureAirport.city.cityIata,
                arrival_city:
                  booking.returnTicket.flight.arrivalAirport.city.name,
                arrival_city_iata:
                  booking.returnTicket.flight.arrivalAirport.city.cityIata,
                departure_time: booking.returnTicket.flight.departureTime,
                arrival_time: booking.returnTicket.flight.arrivalTime,
                airline: {
                  name: booking.returnTicket.airplaneSeatClass.airplane.airline
                    .name,
                  logo_url:
                    booking.returnTicket.airplaneSeatClass.airplane.airline
                      .logoUrl,
                },
                in_flight_facility:
                  booking.returnTicket.airplaneSeatClass.airplane
                    .inFlightFacility,
                seat_class: booking.returnTicket.airplaneSeatClass.type,
                airport: {
                  departure: booking.returnTicket.flight.departureAirport.name,
                  arrival: booking.returnTicket.flight.arrivalAirport.name,
                },
              }
            : null,
        },
        passengers: passengers,
        price_detail: {
          total_price: booking.totalPrice,
          tax: booking.bookingTax,
          donation: booking.donation,
        },
        url_payment: booking.urlPayment,
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
