const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const tickets = await prisma.ticket.findMany({
        include: {
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
