const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { convertDate } = require('../utils/formatedDate');

module.exports = {
  createPromo: async (req, res, next) => {
    try {
      const { name, discount, validFrom, validUntil } = req.body;

      if (!name || !discount || !validFrom || !validUntil) {
        return res.status(400).json({
          status: false,
          message: 'All fields are required',
          data: null,
        });
      }

      const existName = await prisma.promo.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (existName) {
        return res.status(400).json({
          status: false,
          message: 'Promo name is already been used',
          data: null,
        });
      }

      // const convertValidFrom = new Date(validFrom);
      // const convertValidUntil = new Date(validUntil);
      // const convertUTCValidFrom = new Date(
      //   convertValidFrom.getTime() + 7 * 60 * 60 * 1000
      // ).toISOString();
      // const convertUTCValidUntil = new Date(
      //   convertValidUntil.getTime() + 7 * 60 * 60 * 1000
      // ).toISOString();

      const newPromo = await prisma.promo.create({
        data: {
          name,
          discount,
          validFrom,
          validUntil,
          createdAt: convertDate(new Date()),
        },
      });

      res.status(201).json({
        status: true,
        message: 'Promo created successfully',
        data: newPromo,
      });
    } catch (error) {
      next(error);
    }
  },

  getAll: async (req, res, next) => {
    try {
      const promos = await prisma.promo.findMany();

      res.status(200).json({
        status: true,
        message: 'Promos fetched successfully',
        data: promos,
      });
    } catch (error) {
      next(error);
    }
  },

  UpdateTicketPromo: async (req, res, next) => {
    try {
      const ticketId = Number(req.params.ticketId);
      const { promoId } = req.body;

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      const promo = await prisma.promo.findUnique({
        where: { id: promoId },
      });

      if (!ticket) {
        return res
          .status(404)
          .json({ message: `Tiket with ID ${ticketId} not found` });
      }
      if (!promo) {
        return res
          .status(404)
          .json({ message: `Promo with ID ${promoId} not found` });
      }

      const currentDate = new Date();
      if (new Date(promo.validUntil) < currentDate || !promo.isActive) {
        return res.status(400).json({
          status: false,
          message: 'Promo is no longer active',
          data: null,
        });
      }

      const discountAmount = ticket.price * promo.discount;
      const afterDiscountPrice = ticket.price - discountAmount;

      const updateTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { promoId: promoId, afterDiscountPrice: afterDiscountPrice },
      });

      res.status(200).json({
        status: true,
        message: `Ticket prices after discounts with ID ${ticketId} have been successfully updated`,
        data: updateTicket,
      });
    } catch (error) {
      next(error);
    }
  },

  updatePromoStatus: async (req, res, next) => {
    try {
      const convertValidUntil = new Date();
      const convertUTCValidUntil = new Date(
        convertValidUntil.getTime() + 7 * 60 * 60 * 1000
      ).toISOString();

      // Temukan semua promo yang telah kedaluwarsa dan masih aktif
      const expiredPromos = await prisma.promo.findMany({
        where: {
          validUntil: {
            lt: convertUTCValidUntil,
          },
          isActive: true,
        },
      });

      // Perbarui status promo yang kedaluwarsa menjadi tidak aktif
      await Promise.all(
        expiredPromos.map(async (promo) => {
          await prisma.promo.update({
            where: { id: promo.id },
            data: { isActive: false },
          });
        })
      );

      if (res) {
        res.json({
          status: true,
          message: 'Expired promos deactivated successfully',
          data: expiredPromos,
        });
      }
    } catch (error) {
      console.error('Failed to deactivate expired promos:', error);
    }
  },
};
