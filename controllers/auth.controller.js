const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { generateHash, compareHash } = require('../libs/bcrypt');
const sendEmail = require('../utils/sendEmail');
const getRenderedHtml = require('../utils/getRenderedHtml');
const otp = require('../utils/generateOtp');
const prisma = new PrismaClient();
const { JWT_SECRET_KEY } = process.env;

module.exports = {
  register: async (req, res, next) => {
    try {
      let { fullName, email, phoneNumber, password } = req.body;

      if (!fullName || !email || !password || !phoneNumber) {
        return res.status(400).json({
          status: false,
          message: 'All required fields must be filled',
          data: null,
        });
      }

      let exist = await prisma.user.findUnique({ where: { email } });

      if (exist) {
        return res.status(401).json({
          status: false,
          message: 'Email already used!',
          data: null,
        });
      }

      let encryptedPassword = await generateHash(password);

      let user = await prisma.user.create({
        data: {
          fullName,
          phoneNumber,
          email,
          password: encryptedPassword,
          emailIsVerified: false,
        },
      });

      const otpCode = otp.generateOTP().toString();

      const convertCreatedAt = new Date();
      const convertUTCCreatedAt = new Date(
        convertCreatedAt.getTime() + 7 * 60 * 60 * 1000
      ).toISOString();

      await prisma.otp.create({
        data: {
          userId: user.id,
          code: otpCode,
          createdAt: convertUTCCreatedAt,
        },
      });

      await prisma.notification.create({
        data: {
          title: 'Success Register',
          message: 'Akun berhasil dibuat!',
          type: 'general',
          userId: user.id,
          createdAt: convertUTCCreatedAt,
        },
      });

      try {
        const html = getRenderedHtml('otp-email', {
          fullName: user.fullName,
          otp: otpCode,
        });

        await sendEmail({ to: email, subject: 'Your OTP Code', html });
        console.log('Email sent successfully');
      } catch (error) {
        console.error('Failed to send email:', error);
      }

      res.status(200).json({
        status: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  verifyOtp: async (req, res, next) => {
    try {
      let { email, otp } = req.body;

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({
          status: false,
          message: 'Invalid email or OTP',
          data: null,
        });
      }

      let otpRecord = await prisma.otp.findUnique({
        where: { userId: user.id },
      });

      if (otpRecord.code.toString() !== otp.toString()) {
        return res.status(401).json({
          status: false,
          message: 'Invalid OTP',
          data: null,
        });
      }

      await prisma.otp.delete({ where: { userId: user.id } });

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { emailIsVerified: true },
      });

      return res.status(200).json({
        status: true,
        message: 'OTP verified successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  resendOtp: async (req, res, next) => {
    try {
      let { email } = req.body;

      if (!email) {
        return res.status(400).json({
          status: false,
          message: 'Email is required',
          data: null,
        });
      }

      const user = await prisma.user.findFirst({ where: { email } });

      if (!user) {
        return res.status(401).json({
          status: false,
          message: 'User not found',
          data: null,
        });
      }

      const newOtp = otp.generateOTP().toString();

      const convertCreatedAt = new Date();
      const convertUTCCreatedAt = new Date(
        convertCreatedAt.getTime() + 7 * 60 * 60 * 1000
      ).toISOString();

      const updateOtpUser = await prisma.otp.update({
        where: { userId: user.id },
        data: { code: newOtp, createdAt: convertUTCCreatedAt },
      });

      const html = getRenderedHtml('otp-email', {
        fullName: user.fullName,
        otp: newOtp,
      });

      await sendEmail({ to: email, subject: 'Your OTP Code', html });

      return res.status(200).json({
        status: true,
        message: 'OTP resent successfully',
        data: updateOtpUser,
      });
    } catch (error) {
      next(error);
    }
  },

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

      let isPasswordCorrect = await compareHash(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: 'Invalid Email or Password',
          data: null,
        });
      }
      delete user.password;

      let token = jwt.sign(user, JWT_SECRET_KEY);

      req.user = { ...user, token };

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

      const convertCreatedAt = new Date();
      const convertUTCCreatedAt = new Date(
        convertCreatedAt.getTime() + 7 * 60 * 60 * 1000
      ).toISOString();

      await prisma.notification.create({
        data: {
          title: 'Login Successfully',
          message: 'You have successfully logged in',
          type: 'general',
          createdAt: convertUTCCreatedAt,
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
  verified: async (req, res, next) => {
    try {
      return res.status(200).json({
        status: true,
        message: 'User verified successfully',
        data: req.user,
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
          data: null,
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, fullName: true },
      });

      if (!user) {
        return res.status(400).json({
          status: false,
          message: 'Account with the corresponding email does not exist',
          data: null,
        });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const html = getRenderedHtml('resetPasswordEmail', {
        name: user.fullName,
        resetPasswordUrl: `${baseUrl}/reset-password?token=${token}`,
      });

      await sendEmail({
        to: 'ramaastra333@gmail.com',
        subject: 'Aviatick - Reset Password Confirmation',
        html,
      });

      res.status(200).json({
        status: true,
        message: `Email sent to ${email}`,
        data: null,
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
          data: null,
        });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({
          status: false,
          message: `Field 'password' is required`,
          data: null,
        });
      }

      jwt.verify(token, process.env.JWT_SECRET_KEY, async (error, data) => {
        if (error) {
          return res.status(401).json({
            status: false,
            message: 'Unauthorized',
            data: null,
          });
        }

        const { email } = await prisma.user.findFirst({
          where: { id: data.id },
          select: { email: true },
        });

        if (!email) {
          return res.status(400).json({
            status: false,
            message: 'Invalid token',
            data: null,
          });
        }

        const hashedPassword = await generateHash(password);
        const user = await prisma.user.update({
          data: { password: hashedPassword },
          where: { email },
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        });

        res.status(200).json({
          status: true,
          message: 'Password updated',
          data: user,
        });
      });
    } catch (error) {
      next(error);
    }
  },
  changePassword: async (req, res, next) => {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        status: false,
        message: `Field 'oldPassword', 'newPassword', and 'confirmNewPassword' are required`,
        data: null
      });
    }

    const { password: currentHashedPassword} = await prisma.user.findUnique({
      where: {
        email: req.user.email
      },
      select: {
        password: true
      }
    });

    const isCurrentPasswordMatch = await compareHash(oldPassword, currentHashedPassword);
    if (!isCurrentPasswordMatch) {
      return res.status(400).json({
        status: false,
        message: `Field 'oldPassword' do not match the current password`,
        data: null
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        status: false,
        message: `Field 'newPassword' and 'confirmNewPassword' do not match`,
        data: null
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        status: false,
        message: 'New password could not be the same as old password',
        data: null
      });
    }

    const newHashedPassword = await generateHash(newPassword);
    await prisma.user.update({
      data: {
        password: newHashedPassword
      },
      where: {
        email: req.user.email,
      }
    });

    res.status(200).json({
      status: true,
      message: 'Password changed',
      data: null
    });
  },

  updateUserProfile: async (req, res, next) => {
    try {
      const { id } = req.user;
      const {
        fullName,
        familyName,
        phoneNumber,
        identityType,
        identityNumber,
        nationality,
      } = req.body;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: 'User not found',
          data: null,
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          fullName,
          familyName,
          phoneNumber,
          identityType,
          identityNumber,
          nationality,
        },
      });

      return res.status(200).json({
        status: true,
        message: 'User profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: 'User not found',
          data: null,
        });
      }

      await prisma.notification.deleteMany({
        where: { userId: id },
      });

      await prisma.otp.deleteMany({
        where: { userId: id },
      });

      await prisma.user.delete({ where: { id } });

      return res.status(200).json({
        status: true,
        message: 'User deleted successfully',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  },
  getAll: async (req, res, next) => {
    try {
      const users = await prisma.user.findMany();
      return res.status(200).json({
        status: true,
        message: 'Users fetched successfully',
        data: users,
      });
    } catch (error) {
      next(error);
    }
  },
  getUserById: async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: `User with ID ${id} not found`,
          data: null,
        });
      }
      return res.status(200).json({
        status: true,
        message: 'User fetched successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
};
