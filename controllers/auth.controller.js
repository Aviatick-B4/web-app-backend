const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = process.env;
const bcrypt = require('bcrypt');

module.exports = {
  login: async (req, res, next) => {
    try {
      let { emailOrPhoneNumber, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emailOrPhoneNumber },
            { phoneNumber: emailOrPhoneNumber },
          ],
        },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: 'Account not found',
          data: null,
        });
      }

      let isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: 'Invalid Email or Password',
          data: null,
        });
      }
      delete user.password;

      let token = jwt.sign(user, JWT_SECRET_KEY);

      if (!user.password && user.googleId) {
        return res.status(401).json({
          status: false,
          message: 'Authentication failed. Please use Google OAuth to log in',
          data: null,
        });
      }

      if (!user.emailIsVerified) {
        return res.status(403).json({
          status: false,
          message: 'Your account is not verified',
          data: null,
        });
      }

      await prisma.notification.create({
        data: {
          title: 'Login Successfully',
          message: 'You have successfully logged in',
          createdAt: new Date(),
          userId: user.id,
        },
      });

      return res.status(200).json({
        status: true,
        message: 'Login Successfully',
        data: {
          user: user,
          token: token,
        },
      });
    } catch (error) {
      next(error);
    }
  },
  googleLogin: async (req, res, next) => {
    try {
      const updateUser = await prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: {
          emailIsVerified: true,
        },
      });

      const { password, ...userWithoutPassword } = req.user;

      let token = jwt.sign({ id: req.user.id }, JWT_SECRET_KEY);

      return res.status(200).json({
        status: true,
        message: 'Successfully logged in with google',
        data: { user: userWithoutPassword, token },
      });
    } catch (error) {
      next(error);
    }
  },
};
