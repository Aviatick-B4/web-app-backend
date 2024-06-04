const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { generateHash } = require('../libs/bcrypt');
const sendEmail = require('../utils/sendEmail');
const getRenderedHtml = require('../utils/getRenderedHtml');
const prisma = new PrismaClient();
const { JWT_SECRET_KEY } = process.env;

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
  sendResetPasswordEmail: async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          status: false,
          message: `Field 'email' is required`,
          data: null
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, fullName: true }
      });
  
      if (!user) {
        return res.status(400).json({
          status: false,
          message: 'Account with the corresponding email does not exist',
          data: null
        });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const html = getRenderedHtml('resetPasswordEmail', {
        name: user.fullName,
        resetPasswordUrl: `${baseUrl}/reset-password?token=${token}`
      });

      await sendEmail({
        to: 'ramaastra333@gmail.com',
        subject: 'Aviatick - Reset Password Confirmation',
        html
      });

      res.status(200).json({
        status: true,
        message: `Email sent to ${email}`,
        data: null
      });
    } catch (error) {
      next(error);
    }
  },
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
