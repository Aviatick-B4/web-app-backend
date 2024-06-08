const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const getPagination = require('../utils/getPagination');

module.exports = {
  getAll: async (req, res, next) => {
    try {
      const {
        page = req.query.page || 1,
        limit = req.query.limit || 10,
        search,
        type,
      } = req.query;

      let whereClause = {
        userId: Number(req.user.id),
        title: { contains: search, mode: 'insensitive' },
      };

      if (type) {
        if (type === 'transaction') {
          whereClause.type = 'transaction';
        } else if (type === 'promo') {
          whereClause.type = 'promo';
        } else {
          whereClause.type = 'general';
        }
      }

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      });

      const count = await prisma.notification.count({
        where: whereClause,
      });

      const pagination = getPagination(req, page, limit, count);

      return res.status(200).json({
        status: true,
        message: 'Notifications retrieved successfully',
        data: notifications,
        pagination: pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          status: false,
          message: 'Title and message fields are required',
        });
      }

      const existTitle = await prisma.notification.findFirst({
        where: { title: title },
      });

      if (existTitle) {
        return res.status(400).json({
          status: false,
          message: 'Notification title is already been used',
          data: null,
        });
      }

      const users = await prisma.user.findMany();

      const allNotification = await Promise.all(
        users.map(async (user) => {
          const currentDate = new Date();
          const convertCurrentDate = new Date(
            currentDate.getTime() + 7 * 60 * 60 * 1000
          ).toISOString();
          return prisma.notification.create({
            data: {
              title,
              message,
              type: 'promo',
              userId: user.id,
              createdAt: convertCurrentDate,
            },
          });
        })
      );

      res.status(201).json({
        status: true,
        message: 'Notifications for all users created successfully',
        data: allNotification,
      });
    } catch (error) {
      next(error);
    }
  },
};
