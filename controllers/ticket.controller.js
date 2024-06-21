const { PrismaClient } = require('@prisma/client');
const getPagination = require('../utils/getPagination');
const prisma = new PrismaClient();

module.exports = {
  getAll: async (req, res, next) => {
    const { page = 1, limit = 10, promo } = req.query;
    const isPromo = Boolean(promo);

    try {
      const tickets = await prisma.ticket.findMany({
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        where: isPromo ? { promoId: { not: null } } : {},
        include: {
          airplaneSeatClass: {
            include: {
              airplane: {
                include: {
                  airline: true
                }
              }
            }
          },
          flight: {
            include: {
              arrivalAirport: {
                include: {
                  city: true
                }
              },
              departureAirport: {
                include: {
                  city: true
                }
              }
            }
          }
        }
      });

      const count = await prisma.ticket.count({ where: isPromo ? { promoId: { not: null } } : {} });
      const pagination = getPagination(req, parseInt(page), parseInt(limit), count);

      res.status(200).json({
        status: true,
        message: 'Flight ticket(s) fetched',
        data: { tickets, pagination }
      });
    } catch (error) {
      next(error);
    }
  },
  search: async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      from: originCity,
      to: destinationCity,
      departure,
      passengers: passengersCount,
      seat_class: seatClass
    } = req.query;

    if (
      !originCity ||
      !destinationCity ||
      !departure ||
      !passengersCount ||
      !seatClass
    ) {
      return res.status(400).json({
        status: false,
        message:
          "Field 'from', 'to', 'departure', 'passengers', and 'seat_class' are required",
        data: null
      });
    }

    const departureDate = new Date(departure);
    const departureAfterDay = new Date(departure);
    departureAfterDay.setDate(departureAfterDay.getDate() + 1);

    try {
      const searchFilter = {
        airplaneSeatClass: {
          type: seatClass
        },
        flight: {
          departureTime: {
            gte: departureDate,
            lt: departureAfterDay
          },
          departureAirport: {
            city: {
              cityIata: originCity
            }
          },
          arrivalAirport: {
            city: {
              cityIata: destinationCity
            }
          }
        }
      };

      const tickets = await prisma.ticket.findMany({
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        where: searchFilter,
        include: {
          airplaneSeatClass: {
            include: {
              airplane: {
                include: {
                  airline: true
                }
              }
            }
          },
          flight: {
            include: {
              arrivalAirport: {
                include: {
                  city: true
                }
              },
              departureAirport: {
                include: {
                  city: true
                }
              }
            }
          }
        }
      });

      const count = await prisma.ticket.count({ where: searchFilter });
      const pagination = getPagination(req, parseInt(page), parseInt(limit), count);

      res.status(200).json({
        status: true,
        message: 'Flight ticket(s) fetched',
        data: {
          tickets,
          pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }
};
