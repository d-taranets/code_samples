const passport = require('passport');
const Op = require('sequelize').Op;
const {UserRole, Role, AccountPermission, CoOrganizer, Event, Account, User, OrganizerProfiles} = require('../sequelize');
const {authErrorTypes, roles: accountRoles} = require('../utils/constants');

const errorWrap = (handler) =>
{
  return (...args) => {
    handler(...args).catch(args[args.length - 1]);
  };
};

module.exports = function (roles, options) {
  return errorWrap(async (req, res, next) => {
    passport.authenticate('jwt', { session: false }, async (err, user, info) => {
        if (info && info.constructor.name === 'TokenExpiredError') {
        return res
            .status(401)
            .json({
                error: 'Unauthorized',
                message: 'Token expired',
                type: authErrorTypes.tokenExpired
            });
      }

      if (!user) {
        return res
            .status(403)
            .json({
                error: 'Access denied',
                message: 'You have not enough rights',
                type: authErrorTypes.userNotFound
            });
      }

      if (roles && roles.length) {
          const allowedRoles = await Role.findAll({
              where: {
                  name: {[Op.in]: roles}
              }
          });
          const isHaveAccess = Number(await UserRole.count({
              where: {
                  user: user.user,
                  role_id: {[Op.in]: allowedRoles.map((role)=> role.id )}
              }
          }));

          /*
            user.is_admin has full access (Super admin)
          */
          if (!isHaveAccess && !user.is_admin) {
              return res
                  .status(403)
                  .json({
                      error: 'Access denied',
                      message: 'You have not enough rights',
                      type: authErrorTypes.accessDenied
                  });
          }
      }

      if (options === 'coOrganizers') {
          // Any event organizer (owner, account admin, or other co-organizers) can  invite another co-organizer.
          const {eventId} = req.body;
          const event = await Event.findOne({
              where: {event: eventId || ''},
              include: [
                  {model: Account}
              ]
          });

          if (!event) return res.send({status: 500, message: 'Event not found.'});

          const admin = await AccountPermission.findOne({
              where: {
                  account_id: event.account_id,
              },
              include: [
                  {model: User, as: 'user',  where: {user: user.user}, required: true},
                  {model: Role, where: {name: {[Op.in]: [accountRoles.admin]}}, required: true}
              ],
          });

          const coOrganizer = await CoOrganizer.findOne({
              where: {event_id: eventId},
              include: [{model: User, where: {user: user.user}, required: true}],
          });

          const organizerProfiles = await OrganizerProfiles.findOne({
              where: {
                  id: event.dataValues.organizer_profile_id,
              }
          });

          let haveAccess = false;

          if (organizerProfiles) {
              haveAccess = true;
          } else if (event.account && event.account.owner_id === user.user) {
              haveAccess = true;
          } else if (admin) {
              haveAccess = true;
          } else if (coOrganizer) {
              haveAccess = true;
          }

          if (!haveAccess && !user.is_admin) {
              return res
                  .status(403)
                  .json({
                      error: 'Access denied',
                      message: 'You have not enough rights',
                      type: authErrorTypes.accessDenied
                  });
          }
      }

      req.user = user;

      next();
    })(req, res, next);
  });
};
