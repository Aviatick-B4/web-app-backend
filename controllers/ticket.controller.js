const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  getAll: async (req, res, next) => {
    const {
      from: originCity,
      to: destinationCity,
      departure: departureDate,
      return: returnDate,
      passengers: passengersCount,
      seat_class: seatClass
    } = req.query;

    if (
      !originCity ||
      !destinationCity ||
      !departureDate ||
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

    try {
      const tickets = await prisma.ticket.findMany({
        where: {
          airplaneSeatClass: {
            type: seatClass
          },
          OR: [
            {
              flight: {
                departureTime: {
                  gt: new Date(departureDate)
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
            },
            returnDate
              ? {
                  flight: {
                    departureTime: {
                      gt: new Date(returnDate)
                    },
                    departureAirport: {
                      city: {
                        cityIata: destinationCity
                      }
                    },
                    arrivalAirport: {
                      city: {
                        cityIata: originCity
                      }
                    }
                  }
                }
              : {}
          ]
        },
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

      const formattedTickets = { departure: [], return: [] };
      tickets.forEach((ticket) => {
        const departureTime = ticket.flight.departureTime
          .toISOString()
          .slice(0, 10);
        if (departureTime === returnDate) {
          formattedTickets.return.push(ticket);
        } else {
          formattedTickets.departure.push(ticket);
        }
      });

      res.status(200).json({
        status: true,
        message: 'Flight ticket(s) fetched',
        data: formattedTickets
      });
    } catch (error) {
      next(error);
    }
  }
};
