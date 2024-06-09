const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const getPagination = require('../utils/getPagination');

module.exports = {
  favoriteDestinations: async (req, res, next) => {
    try {
      const { page = req.query.page || 1, limit = req.query.limit || 5 } =
        req.query;

      const getFavorite = await prisma.flight.findMany({
        orderBy: {
          count: 'desc',
        },
        include: {
          departureAirport: {
            include: {
              city: true,
            },
          },
          arrivalAirport: {
            include: {
              city: true,
            },
          },
          ticket: {
            include: {
              airplaneSeatClass: {
                include: {
                  airplane: {
                    include: {
                      airline: true,
                    },
                  },
                },
              },
            },
          },
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      });

      const result = getFavorite.map((flight) => ({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        departureCity: flight.departureAirport.city.name,
        arrivalCity: flight.arrivalAirport.city.name,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        airline: flight.ticket[0]?.airplaneSeatClass?.airplane?.airline?.name,
        price: flight.ticket.length > 0 ? flight.ticket[0].price : null,
        count: flight.count,
      }));

      const pagination = getPagination(req, page, limit);

      return res.status(200).json({
        status: true,
        message: 'Favorite destinations retrieved successfully',
        data: result,
        pagination,
      });
    } catch (error) {
      next(error);
    }
  },
};
