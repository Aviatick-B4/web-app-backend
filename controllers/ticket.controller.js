const { PrismaClient } = require('@prisma/client');
const getPagination = require('../utils/getPagination');
const prisma = new PrismaClient();

module.exports = {
  getAll: async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
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
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
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

      const count = await prisma.ticket.count({
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
        }
      });
      const pagination = getPagination(req, parseInt(page), parseInt(limit), count);

      res.status(200).json({
        status: true,
        message: 'Flight ticket(s) fetched',
        data: {
          tickets: formattedTickets,
          pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }
};
