const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { generateHash } = require('../libs/bcrypt');
const prisma = new PrismaClient();

module.exports = {
  resetPassword: async (req, res, next) => {
    try {
      const { token } = req.query;
      if (!token) {
        res.status(400).json({
          status: false,
          message: 'Token must be provided',
          data: null
        });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({
          status: false,
          message: `Field 'password' is required`,
          data: null
        });
      }

      jwt.verify(token, process.env.JWT_SECRET_KEY, async (error, data) => {
        if (error) {
          return res.status(401).json({
            status: false,
            message: 'Unauthorized',
            data: null
          });
        }

        const { email } = await prisma.user.findFirst({
          where: { id: data.id },
          select: { email: true }
        });

        if (!email) {
          return res.status(400).json({
            status: false,
            message: 'Invalid token',
            data: null
          });
        }

        const hashedPassword = await generateHash(password);
        const user = await prisma.user.update({
          data: { password: hashedPassword },
          where: { email },
          select: {
            id: true,
            fullName: true,
            email: true
          }
        });

        res.status(200).json({
          status: true,
          message: 'Password updated',
          data: user
        })
      });
    } catch (error) {
      next(error);
    }
  }
}
