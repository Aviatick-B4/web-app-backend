const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL } = process.env;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_REDIRECT_URL,
    },
    async function (accessToken, GOOGLE_REFRESH_TOKEN, profile, done) {
      if (profile.emails && profile.emails.length > 0) {
        const email = profile.emails[0].value;

        const existingUser = await prisma.user.findUnique({
          where: { email: email },
        });

        if (existingUser) {
          done(null, existingUser);
        } else {
          let user = await prisma.user.upsert({
            where: { email: email },
            update: { googleId: profile.id },
            create: {
              fullName: profile.name.givenName,
              familyName: profile.name.familyName,
              email: email,
              googleId: profile.id,
              phoneNumber: null,
            },
          });

          done(null, user);
        }
      } else {
        done(new Error('No email found in profile'), null);
      }
    }
  )
);

module.exports = passport;
