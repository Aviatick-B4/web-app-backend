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

      res.status(200).json({
        status: true,
        message: 'Flight ticket(s) fetched',
        data: tickets
      });
    } catch (error) {
      next(error);
    }
  }
};
