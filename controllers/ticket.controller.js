const { PrismaClient } = require('@prisma/client');
const getPagination = require('../utils/getPagination');
const prisma = new PrismaClient();

module.exports = {
  getAll: async (req, res, next) => {
    const { page = 1, limit = 10, promo = '' } = req.query;
    const isPromo = promo.toLowerCase() === 'true';

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
                  airline: true,
                },
              },
            },
          },
          flight: {
            include: {
              arrivalAirport: {
                include: {
                  city: true,
                },
              },
              departureAirport: {
                include: {
                  city: true,
                },
              },
            },
          },
        },
      });

      const formattedTickets = getFormattedTickets(tickets);
      const count = await prisma.ticket.count({
        where: isPromo ? { promoId: { not: null } } : {},
      });
      const pagination = getPagination(
        req,
        parseInt(page),
        parseInt(limit),
        count
      );

      res.status(200).json({
        status: true,
        message: 'Flight ticket(s) fetched',
        data: { tickets: formattedTickets, pagination },
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
      seat_class: seatClass,
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
        data: null,
      });
    }

    const departureDate = new Date(departure);
    if (!departureDate.getDate()) {
      return res.status(400).json({
        status: false,
        message: 'Invalid date (only accepts YYYY-MM-DD format)',
        data: null,
      });
    }

    const departureAfterDay = new Date(departure);
    departureAfterDay.setDate(departureAfterDay.getDate() + 1);

    try {
      const searchFilter = {
        airplaneSeatClass: {
          type: seatClass,
        },
        flight: {
          departureTime: {
            gte: departureDate,
            lt: departureAfterDay,
          },
          departureAirport: {
            city: {
              cityIata: originCity,
            },
          },
          arrivalAirport: {
            city: {
              cityIata: destinationCity,
            },
          },
        },
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
                  airline: true,
                },
              },
            },
          },
          flight: {
            include: {
              arrivalAirport: {
                include: {
                  city: true,
                },
              },
              departureAirport: {
                include: {
                  city: true,
                },
              },
            },
          },
        },
      });

      const formattedTickets = getFormattedTickets(tickets);
      const count = await prisma.ticket.count({ where: searchFilter });
      const pagination = getPagination(
        req,
        parseInt(page),
        parseInt(limit),
        count
      );

      res.status(200).json({
        status: true,
        message: 'Flight ticket(s) fetched',
        data: { tickets: formattedTickets, pagination },
      });
    } catch (error) {
      next(error);
    }
  },
};

function getFormattedTickets(tickets) {
  const formattedTickets = tickets.map((ticket) => {
    return {
      id: ticket.id,
      price: ticket.price,
      afterDiscountPrice: ticket.afterDiscountPrice,
      promo: ticket.promoId,
      flight: {
        code: ticket.flight.flightNumber,
        departure: {
          time: ticket.flight.departureTime,
          city: ticket.flight.departureAirport.city.name,
          continent: ticket.flight.departureAirport.city.continent,
          imageUrl: ticket.flight.departureAirport.city.imageUrl,
          cityIata: ticket.flight.departureAirport.city.cityIata,
          country: ticket.flight.departureAirport.city.country,
          airport: ticket.flight.departureAirport.name,
          airportCode: ticket.flight.departureAirport.airportCode,
        },
        arrival: {
          time: ticket.flight.arrivalTime,
          city: ticket.flight.arrivalAirport.city.name,
          continent: ticket.flight.arrivalAirport.city.continent,
          imageUrl: ticket.flight.arrivalAirport.city.imageUrl,
          cityIata: ticket.flight.arrivalAirport.city.cityIata,
          country: ticket.flight.arrivalAirport.city.country,
          airport: ticket.flight.arrivalAirport.name,
          airportCode: ticket.flight.arrivalAirport.airportCode,
        },
      },
      airplane: {
        model: ticket.airplaneSeatClass.airplane.model,
        passengerCapacity: ticket.airplaneSeatClass.airplane.passengerCapacity,
        baggageCapacity: ticket.airplaneSeatClass.airplane.baggageCapacity,
        cabinCapacity: ticket.airplaneSeatClass.airplane.cabinCapacity,
        inFlightFacility: ticket.airplaneSeatClass.airplane.inFlightFacility,
        seatClass: {
          type: ticket.airplaneSeatClass.type,
          seatCount: ticket.airplaneSeatClass.totalSeat,
        },
        airline: {
          name: ticket.airplaneSeatClass.airplane.airline.name,
          code: ticket.airplaneSeatClass.airplane.airline.airlineIata,
          logoUrl: ticket.airplaneSeatClass.airplane.airline.logoUrl,
        },
      },
    };
  });

  return formattedTickets;
}
