const passport = require('passport');
const { Strategy, ExtractJwt } = require('passport-jwt');

const {User} = require('../sequelize');
const config = require('../config');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.app.JWT_SECRET,
  ignoreExpiration: true
};

passport.use(new Strategy(opts, async (jwt_payload, done) => {
  const user = await User.findOne({
    where: {
      user: jwt_payload.user,
    }
  });

  if (!user) {
    return done(null, false);
  }

  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user.user);
});

passport.deserializeUser(async (user, done) => {
  const User = await User.findOne({
    where: {
      user: user.user,
    }
  });

  done(null, User);
});

module.exports = passport;
