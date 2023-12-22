const passport = require('passport');
const { Strategy } = require('passport-local');
const {User} = require('../sequelize');

passport.use(new Strategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
  const user = await User.findOne({
    where: {email},
  });
  const userSecureData = await User.findOne({
    where: {email},
    attributes: ['user', 'salt', 'hash'],
  });

  if (!user || !userSecureData) {
    return done('The email entered doesn\'t exist.  Please signup.', false);
  }

  const verified = userSecureData.verifyPassword(password);

  if (userSecureData.salt && userSecureData.hash && !verified) {
    return done('The password you\'ve entered is incorrect ', false);
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
