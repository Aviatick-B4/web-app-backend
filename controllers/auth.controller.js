const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { generateHash, compareHash } = require('../libs/bcrypt');
const sendEmail = require('../utils/sendEmail');
const getRenderedHtml = require('../utils/getRenderedHtml');
const otp = require('../utils/generateOtp');
const separateName = require('../utils/separateName');
const axios = require('axios');
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

      const phoneRegex = /^0[2-9]\d{8,12}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          status: false,
          message: 'Phone number must start with 0 and be 10-14 digits long',
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

      const MIN_PASSWORD_LENGTH = 6;
      if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          status: false,
          message: `Password must have minimum of ${MIN_PASSWORD_LENGTH} characters`,
          data: null,
        });
      }

      let encryptedPassword = await generateHash(password);
      const { firstName, familyName } = separateName(fullName);

      let user = await prisma.user.create({
        data: {
          fullName: firstName,
          familyName,
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
  LoginGoogle: async (req, res, next) => {
    try {
      // Destructures 'access_token' from the request body
      const { access_token } = req.body;

      if (!access_token) {
        return res.status(400).json({
          status: false,
          message: 'Missing required field',
          data: null,
        });
      }

      // Gets Google user data using the access token
      const googleData = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
      );

      // Extracts the full name and family name from the Google data
      const fullName = googleData?.data?.name;
      const { firstName, familyName } = separateName(fullName);

      // Upserts user data in case the user already exists in the database
      const user = await prisma.user.upsert({
        where: {
          email: googleData?.data?.email,
        },
        update: {
          fullName: firstName, 
          familyName: familyName, 
          googleId: googleData?.data?.sub, 
          emailIsVerified: true, 
        },
        create: {
          email: googleData?.data?.email,
          fullName: firstName,
          familyName: familyName,
          password: '',
          emailIsVerified: true,
          googleId: googleData?.data?.sub,
        },
      });

      // Deletes the user's password from the user object for security reasons
      delete user.password;

      // Creates a JWT token for the user
      const token = jwt.sign(user, JWT_SECRET_KEY);

      // Returns a successful response with the user data and token
      return res.status(200).json({
        status: true,
        message: 'Successfully login with Google',
        data: {
          user,
          token,
        },
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

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '30m' });
      const baseUrl = process.env.CLIENT_BASE_URL;
      const html = getRenderedHtml('resetPasswordEmail', {
        name: user.fullName,
        resetPasswordUrl: `${baseUrl}/reset-password?token=${token}`,
      });

      await sendEmail({
        to: email,
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

      const MIN_PASSWORD_LENGTH = 6;
      if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          status: false,
          message: `Field 'password' must have minimum of ${MIN_PASSWORD_LENGTH} characters`,
          data: null,
        });
      }

      jwt.verify(token, process.env.JWT_SECRET_KEY, async (error, data) => {        
        if (error) {
          return res.status(400).json({
            status: false,
            message: error.name === 'TokenExpiredError'
              ? 'Token is expired'
              : `Invalid token: ${error.message}`,
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
        data: null,
      });
    }

    const { password: currentHashedPassword } = await prisma.user.findUnique({
      where: {
        email: req.user.email,
      },
      select: {
        password: true,
      },
    });

    const isCurrentPasswordMatch = await compareHash(
      oldPassword,
      currentHashedPassword
    );
    if (!isCurrentPasswordMatch) {
      return res.status(400).json({
        status: false,
        message: `Field 'oldPassword' do not match the current password`,
        data: null,
      });
    }

    const MIN_PASSWORD_LENGTH = 6;
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        status: false,
        message: `Field 'newPassword' must have minimum of ${MIN_PASSWORD_LENGTH} characters`,
        data: null,
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        status: false,
        message: `Field 'newPassword' and 'confirmNewPassword' do not match`,
        data: null,
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        status: false,
        message: 'New password could not be the same as old password',
        data: null,
      });
    }

    const newHashedPassword = await generateHash(newPassword);
    await prisma.user.update({
      data: {
        password: newHashedPassword,
      },
      where: {
        email: req.user.email,
      },
    });

    res.status(200).json({
      status: true,
      message: 'Password changed',
      data: null,
    });
  },

  updateUserProfile: async (req, res, next) => {
    try {
      const { id } = req.user;
      const {
        fullName,
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

      const phoneRegex = /^0[2-9]\d{8,12}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          status: false,
          message: 'Nomor telepon harus dimulai dengan 0 dan memiliki panjang 10-13 digit',
          data: null,
        });
      }

      if (identityType === 'KTP' && !/^\d{16}$/.test(identityNumber)) {
        return res.status(400).json({
          status: false,
          message: 'Nomor KTP harus terdiri dari 16 digit',
          data: null,
        });
      }

      if (identityType === 'SIM' && !/^\d{16}$/.test(identityNumber)) {
        return res.status(400).json({
          status: false,
          message: 'Nomor SIM harus terdiri dari 16 digit',
          data: null,
        });
      }

      if (identityType === 'Paspor' && !/^[A-Z]\d{6}$/.test(identityNumber)) {
        return res.status(400).json({
          status: false,
          message: 'Nomor paspor harus terdiri dari 1 huruf diikuti oleh 6 digit',
          data: null,
        });
      }

      const { firstName, familyName } = separateName(fullName);
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          fullName: firstName,
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
      const id = req.user.id;

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

      const bookings = await prisma.booking.findMany({
        where: { userId: id },
      });

      for (const booking of bookings) {
        await prisma.payment.deleteMany({
          where: { bookingId: booking.id },
        });
        await prisma.passenger.deleteMany({
          where: { bookingId: booking.id },
        });
        await prisma.booking.delete({
          where: { id: booking.id },
        });
      }

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
  getUserByToken: async (req, res, next) => {
    try {
      const id = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: id },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: 'User not found',
          data: null,
        });
      }

      return res.status(200).json({
        status: true,
        message: 'User profile fetched successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
};
