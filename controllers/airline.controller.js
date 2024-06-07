const { PrismaClient } = require('@prisma/client');
const cloudStorage = require('../utils/cloudStorage');
const convertBytes = require('../utils/convertBytes');
const prisma = new PrismaClient();

module.exports = {
  updateLogo: async (req, res, next) => {
    try {
      const { id } = req.params;
      const airline = await prisma.airline.findUnique({ where: { id: parseInt(id) }});
      if (!airline) {
        return res.status(400).json({
          status: false,
          message: `Could not find any airline data with id ${id}`,
          data: null
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: false,
          message: `Field 'file' is required`,
          data: null
        });
      }

      const MAX_FILE_SIZE = 300;
      if (convertBytes(req.file.size, 'kilobytes') > MAX_FILE_SIZE) {
        return res.status(400).json({
          status: false,
          message: `File size exceeds the maximum limit (${MAX_FILE_SIZE} KB)`,
          data: null
        });
      }

      const { buffer, originalname } = req.file;
      const { url, fileId } = await cloudStorage.upload(buffer, originalname, 'airlines');
      const updatedAirline = await prisma.airline.update({
        data: {
          logoUrl: url,
          logoId: fileId
        },
        where: {
          id: parseInt(id)
        }
      });

      if (airline.logo_id) await cloudStorage.delete(airline.logo_id);

      res.status(200).json({
        status: true,
        message: 'Airline logo updated',
        data: updatedAirline
      });
    } catch (error) {
      next(error);
    }
  }
}
