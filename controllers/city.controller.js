const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const { search: searchKeyword } = req.query;
      const cities = await prisma.city.findMany(
        searchKeyword
          ? {
              where: {
                name: {
                  contains: searchKeyword,
                  mode: 'insensitive'
                }
              }
            }
          : {}
      );

      res.status(200).json({
        status: true,
        message: 'Cities fetched',
        data: cities
      });
    } catch (error) {
      next(error);
    }
  }
};
