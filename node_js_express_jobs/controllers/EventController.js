const utils = require('../utils/utils');
const bq = require('../jobs/bee-queue');
const {
    Event,
    EventSession,
    EventTicket,
    UserSession,
    EventRegistration,
    FishbowlUser,
    User,
    EventActivity,
    ChatMessage,
    UserBioProgress,
    UserUserPreference,
    Account,
    UserTicket,
    Transaction,
    UserNote,
    Invoice,
    IntersessionSurvey,
    WrapupSurvey,
    WrapupSurveyQuestion,
    EventFeedback,
    OrganizerProfiles,
    AccountSubscriptionPlan
} = require('../sequelize');
const redisUtils = require('../utils/redisUtils');
const wsEvents = require('../listeners/wsListener');
const config = require('../config');
const Op = require('sequelize').Op;
const {sanitizeInfo, logger, prepareConversations} = require("../utils/helpers");
const {ticketStatuses, invoiceStatuses, eventRegistrationStatuses: erStatuses,} = require("../utils/constants");
const {createOrUpdateUser, sendEventFeedback} = require("../controllers/UsersController");
const {refundPayment} = require('./StripePaymentController');

const prepareEventSessions = async (sessions, minPerSession, internalEndDate) => {
    await bq.schedulerChecker({
        event_id: sessions[0].event,
        date: Date.now() + 2 * 60 * 1000
    });

    if (Date.now() < internalEndDate) {
        await bq.disconnectTokboxSession({
            event_id: sessions[0].event,
            date: internalEndDate + 4 * 60 * 1000
        });

        await bq.wrapupAllContactsEmail({
            event_id: sessions[0].event,
            date: internalEndDate + 5 * 60 * 1000
        });
    }

    return Promise.all(sessions.map(async (session) => {
        await EventSession.create({
            event_id: session.event,
            session_id: session.event_session,
            session_number: session.session_number,
            session_duration: session.session_duration,
            session_start_time: session.session_start_time,
            session_end_time: session.session_end_time
        });

        setupScheduledJobs(session, minPerSession);
    }));
};

const setupScheduledJobs = (session, minPerSession) => {

    const halfWay = minPerSession * 30 * 1000;

    if (Date.now() < Date.parse(session.session_start_time))
        bq.startSessionJob({
            event_id: session.event,
            current_session: parseInt(session.session_number),
            date: Date.parse(session.session_start_time)
        });

    if (Date.now() < (Date.parse(session.session_end_time) - halfWay))
        bq.halfWaySessionNotification({
            event_id: session.event,
            current_session: parseInt(session.session_number),
            date: Date.parse(session.session_end_time) - halfWay
        });

    if (Date.now() < (Date.parse(session.session_end_time) - 60000))
        bq.oneMinuteReminderNotification({
            event_id: session.event,
            current_session: parseInt(session.session_number),
            date: Date.parse(session.session_end_time) - 60000
        });

    if (Date.now() < (Date.parse(session.session_start_time) - 30000))
        bq.updateSessionAvailabilityJob({
            event_id: session.event,
            current_session: parseInt(session.session_number),
            date: Date.parse(session.session_start_time) - 30000
        });

    if (Date.now() < (Date.parse(session.session_start_time) - 15000))
        bq.updateSessionAvailabilityJob({
            event_id: session.event,
            current_session: parseInt(session.session_number),
            date: Date.parse(session.session_start_time) - 15000,
            blockExtendAbility: true,
            directMode: true
        });

    if (Date.now() < (Date.parse(session.session_start_time) - 10000))
        bq.triggerAlgorithmJob({
            event_id: session.event,
            current_session: parseInt(session.session_number),
            date: Date.parse(session.session_start_time) - 10000
        });

    if (parseInt(session.session_number) === 1) {
        if (Date.now() < Date.parse(session.session_start_time))
            bq.triggerRightFlyinPopupJob({
                event_id: session.event,
                current_session: parseInt(session.session_number),
                date: Date.parse(session.session_start_time)
            });
        bq.oneMinuteReminderNotification({
            event_id: session.event,
            current_session: parseInt(session.session_number),
            date: Date.parse(session.session_start_time) - 60000
        });
    }

    if (Date.now() < Date.parse(session.session_end_time))
        bq.triggerRightFlyinPopupJob({
            event_id: session.event,
            current_session: parseInt(session.session_number),
            date: Date.parse(session.session_end_time)
        });
};

const prepareEventRegistrations = (registrations) => {
    return Promise.all(registrations.filter(er => sanitizeInfo(er.user)).map((registration) => {
        EventRegistration.findOrCreate({
            where: {
                [Op.and]: [
                    {event_id: registration.event},
                    {user_id: registration.user}
                ]
            },
            defaults: {
                event_registration: registration.event_registration,
                event_id: registration.event,
                user_id: registration.user,
                status: registration.status,
                organizer_mode: registration.organizer_mode,
                is_sponsor: registration.is_sponsor,
                user_score: sanitizeInfo(registration.user_score) || 5,
                available_for_matching_session_num: 0
            }
        });
    }));
};

const updateEventRelationData = async ({event, options}) => {
    if (!event) return;

    const {event: event_id} = event;
    const currentDateTime = new Date();

    if (options.updateOnly) {
        await redisUtils.clearRedis(event_id);
        if (!options.hasSessions) {
            await prepareEventSessions(options.event_sessions, options.minPerSession, options.internalEndDate);
        } else {
            await bq.schedulerChecker({
                event_id: event_id,
                date: Date.now() + 5000
            });
            await Promise.all(options.event_sessions.map(async (session) => {
                setupScheduledJobs(session, event.min_per_session);
            }));
        }
    } else if (options.hasSessions) {
        await Promise.all([
            Event.destroy({where: {event: event_id}}),
            EventSession.destroy({where: {event_id: event_id}}),
            EventActivity.update(
                {archivedAt: currentDateTime},
                {
                    where: {
                        event_id: event_id,
                        archivedAt: {[Op.is]: null}
                    }
                }
            ),
            EventRegistration.destroy({where: {event_id: event_id}}),
            UserUserPreference.destroy({where: {event_id: event_id}}),
            UserSession.destroy({where: {event_id: event_id}}),
            FishbowlUser.destroy({where: {event_id: event_id}}),
            ChatMessage.destroy({where: {event_id: event_id}}),
            UserBioProgress.destroy({where: {event_id: event_id}}),
            redisUtils.clearRedis(event_id)
        ]);
    }

    wsEvents.emit('live_attendee.clear_stats', {eventId: event_id});

    return wsEvents.emit('activity.clear_activity', {eventId: event_id})
};

const upcomingEvents = async (req, res) => {
      const eventData = req.body.event;

      if (eventData.published_status === 'queued') return res.send({status: 200});

      const event_sessions = utils.createEventSessions(eventData);
      const event_registrations = utils.prepareData(req.body.event_registrations);
      const event_users = utils.prepareData(req.body.event_users);
      const event_organizer = req.body.event_organizer;

      const [event, eventSessions] = await Promise.all([
          Event.findOne({where: {event: eventData.event}}),
          EventSession.findAll({where: {event_id: eventData.event}})
      ]);
      const hasSessions = eventSessions.length;

      const updateOnly = !!(event && (new Date() > new Date(event.start_date_and_time)) && (Date.parse(eventData.start_date_and_time) === Date.parse(event.start_date_and_time)));
      const internalEndDate = new Date(eventData.internal_end_date_and_time).setSeconds(0);
      await updateEventRelationData({
          event,
          options: {
              updateOnly,
              event_sessions,
              hasSessions,
              minPerSession: eventData.min_per_session,
              internalEndDate
          }
      });

      if (!updateOnly) {
          const data = {
              event: eventData.event,
              name: eventData.name,
              description: sanitizeInfo(eventData.description),
              start_date_and_time: eventData.start_date_and_time,
              internal_end_date_and_time: internalEndDate,
              allow_archive: eventData.allow_archive,
              mic_only: eventData.mic_only,
              permit_mobile: eventData.permit_mobile,
              session_format: eventData.session_format
          };

          const prepareEvent = (!hasSessions && event) ? event.update(data) : Event.create(data);
          const prepareSessions = prepareEventSessions(event_sessions, eventData.min_per_session, internalEndDate);
          const prepareEventOrganizer = createOrUpdateUser(sanitizeInfo(event_organizer), null, eventData.event_id);


          const promises = [
              prepareEvent,
              prepareSessions,
              prepareEventOrganizer,
          ];

          if (hasSessions) {
              const prepareRegistrations = prepareEventRegistrations(event_registrations);
              const provideUsers = utils.provideEventUsers(event_users, eventData.event);
              promises.push(prepareRegistrations);
              promises.push(provideUsers);
          }
          await Promise.all(promises);
      }
      wsEvents.emit('management.system_received_data', {eventId: eventData.event});
};

const checkEvent = async (req, res) => {
    const {start_date_and_time, event_id} = req.body;

    const eventData = await Event.findOne({
        where: {
            event: event_id,
            start_date_and_time
        }
    });

    if (!eventData) {
        return res.send({status: 404, message: `Something went wrong with populating data for event: ${event_id}`});
    }

    const eventJobs = await redisUtils.getEventJobs(event_id);
    const schedulersFailed = Object.values(eventJobs).includes(null);

    if (schedulersFailed) {
        return res.send({
            status: 404,
            message: `Data provided, but schedulers were not set successfully for event: ${event_id}`
        });
    }

    return res.send({status: 200, message: 'Success - event exist and schedulers were set successfully.'});
};

const getEvent = async (req, res) => {
    const {query: {withSessions}} = req;
    const eventData = await Event.findOne({
        include: [{model: User, as: 'organizer'}],
        where: {
            event: req.params.eventId
        }
    });
    let accountData = {};
    if (eventData && eventData.account_id) {
        accountData = await Account.findOne({
            where: {
                account: eventData.account_id,
            },
            include: [{model: AccountSubscriptionPlan, as: 'accountSubscriptionPlan', required: false}]
        });
    }
    let eventSessions = {};
    if (eventData && withSessions) {
        eventSessions = await EventSession.findAll({
            where: {
                event_id: req.params.eventId
            },
            order: [
                ['session_number', 'ASC']
            ]
        });
    }
    const eventRegistrations = await EventRegistration.findAll({
        include: [{
            model: User,
            required: true
        }],
        where: {event_id: req.params.eventId, status: erStatuses.attending}
    });

    const response = {status: 200, eventData, accountData, eventRegistrations};
    return eventData ?
        res.send(withSessions ? {...response, eventSessions} : response) :
        res.send({
            status: 404,
            message: 'Event is not found.'
        });
};

const getRegistrationInfo = async (req, res) => {
    const eventId = req.params.eventId;

    const event = await Event.findOne({
        include: [{model: User, as: 'organizer'}, {model: EventTicket, required: false}],
        where: {
            event: eventId
        }
    });

    if (!event) {
        return res.send({status: 404, message: 'Event is not found.'});
    }

    const organizerProfile = await OrganizerProfiles.findOne({
        where: {
            id: event.dataValues.organizer_profile_id,
        }
    });

    const [
        eventRegistrations,
        accountData,
        organizerEvents,
        futureEvents
    ] = await Promise.all([
        EventRegistration.findAll({
            include: [
                {
                    model: User,
                    include: [{
                        model: UserTicket,
                        as: 'tickets',
                        where: {event_id: eventId},
                        required: false,
                        include: [{
                            model: EventTicket,
                            as: 'eventTicket',
                            required: true,
                        }]
                    }]
                },
                {
                    model: UserUserPreference,
                    required: false,
                    where: {event_id: eventId},
                    include: [
                        {
                            model: User,
                            as: 'userPreference',
                            attributes:['email']
                        }
                    ]
                },
            ],
            where: {event_id: eventId},
            order: [
                ['createdAt', 'DESC'],
            ],
        }),
        Account.findOne({
            where: {account: event.account_id},
            include: [{model: AccountSubscriptionPlan, as: 'accountSubscriptionPlan', required: false}]
        }),
        Event.findAll({
            include: [{model: EventRegistration, include: [{model: User}]}, {model: EventTicket}],
            where: {
                event: {[Op.ne]: eventId},
                published_status: 'published',
                privacy_setting: 'Public',
                [Op.and]: [
                    {organizer_id: {[Op.ne]: null}},
                    {organizer_id: event.organizer_id}
                ],
                internal_end_date_and_time: {[Op.gt]: new Date()}
            }
        }),
        Event.findAll({
            include: [{model: EventRegistration, include: [{model: User}]}, {model: EventTicket}],
            where: {
                event: {[Op.ne]: eventId},
                published_status: 'published',
                privacy_setting: 'Public',
                featured_score: {[Op.gt]: 0},
                internal_end_date_and_time: {[Op.gt]: new Date()}
            },
            order: [['featured_score', 'DESC']],
            limit: 3
        })
    ]);

    if (!event.dataValues.organizer_name) {
        event.setDataValue('organizer_name', organizerProfile ? organizerProfile.dataValues.name || '' : '');
    }

    if (!event.dataValues.organizer_description) {
        event.setDataValue('organizer_description', organizerProfile ? organizerProfile.dataValues.description || '' : '');
    }

    const data = {
        event,
        eventRegistrations,
        accountData,
        organizerEvents,
        futureEvents
    };
    return res.send({status: 200, data: data});
};

const saveEventFeedback = async (req, res) => {
    const {
      eventId, userId, feedback, numericType, wrapupSurvey
    } = req.body;

    if (!req.user || req.user.user !== userId) {
        return res
            .status(403)
            .json({
                error: 'Access denied',
                message: 'You have not enough rights',
            });
    }

    const type = numericType ? numericType : 'paragraph';
    const isParagraph = type === 'paragraph';
    await EventFeedback.destroy({where: {event_id: eventId, user_id: userId, question_type: type}});

    const created = await EventFeedback.bulkCreate(feedback.map(item => ({
        event_id: eventId,
        user_id: userId,
        question_number: item.number,
        question_type: item.type,
        question_label: item.label,
        user_answer_numeric: !isParagraph ? item.answer || 0 : null,
        user_answer_text: isParagraph ? item.answer : null,
        wrapup_survey: wrapupSurvey,
    })));

    const promises = feedback.map(item => {
        const data = {
            event: eventId,
            user: userId,
            question_number: item.number,
            question_type: item.type,
            question_label: item.label,
        };

        if (!isParagraph) data.user_answer_numeric = item.answer || 0;
        if (isParagraph) data.user_answer_text = item.answer;

        return sendEventFeedback(JSON.stringify(data), eventId);
    });

    await Promise.all(promises);

    return res.sendStatus(created ? 201 : 500);
};

const getActivity = async (req, res) => {
    const eventId = req.params.eventId;

    const event = await Event.findOne({
        include: [
            {model: EventActivity, required: false, where: {user_id: null, archivedAt: null}}
        ],
        where: {
            event: eventId
        }
    });

    if (!event) {
        return res.send({status: 404, message: 'Event is not found.'});
    }

    const eventRegistrations = await EventRegistration.findAll({
        include: [
            {model: User},
            {model: EventActivity, required: false, where: {event_id: eventId}},
        ],
        where: {event_id: eventId}
    });

    const archivedEventActivities = await EventActivity.findAll({
        include: [
            {model: User, required: false},
            {model: Event, required: false},
        ],
        where: {
            event_id: eventId,
            archivedAt: {[Op.ne]: null}
        }
    });

    const data = {
        current: {
            event,
            eventRegistrations
        },
        archived: {
            archivedEventActivities: utils.formatArchivedActivity(archivedEventActivities),
        }
    };
    return res.send({status: 200, data: data});
};

const getLiveAttendee = async (req, res) => {
    const eventId = req.params.eventId;
    const isForce = req.query.force === '1';

    let response = {
        event: {},
        eventRegistrations: [],
        profileElements: ''
    };

    const redisKey = `live-attendee-stats:${eventId}`;
    const redisData = await redisUtils.getRedisData(redisKey);

    if (isForce || !redisData) {
        const event = await Event.findOne({
            where: {
                event: eventId
            }
        });

        if (!event) {
            return res.send({status: 404, message: 'Event is not found.'});
        }
        const eventRegistrations = await EventRegistration.findAll({
            include: [
                {model: User},
                {
                    model: UserSession,
                    required: true,
                    include: [
                        {model: User, as: 'otherUserA', required: false},
                        {model: User, as: 'otherUserB', required: false},
                    ],
                    where: {event_id: eventId}
                }
            ],
            where: {event_id: eventId}
        });

        const account = await Account.findOne({
            where: {
                account: event.account_id,
            },
            attributes: ['profile_elements']
        });

        response.event = event.dataValues;
        response.eventRegistrations = eventRegistrations.map((eventRegistration)=>eventRegistration.dataValues);
        response.profileElements = account ? account.profile_elements : '';

        const expire = 60 * 60 * 24; //24h
        await redisUtils.storeRedisData(redisKey, response, expire);
    } else {
        response = JSON.parse(redisData);
    }

    return res.send({status: 200, data: response});
};

const removeEventInfo = async (req, res) => {
    const event_id = req.params.eventId;

    if (event_id) {
        const event = await Event.findOne({where: {event: event_id}});
        await updateEventRelationData({event, options: {updateOnly: false}});
    }
    return res.send({status: 200});
};

const clearArchivedActivity = async (req, res) => {
    const event_id = req.params.eventId;

    if (event_id) {
        await EventActivity.destroy(
            {
                where: {
                    event_id: event_id,
                    archivedAt: {[Op.ne]: null}
                }
            }
        );
        wsEvents.emit('activity.clear_activity', {eventId: event_id})
    }
    return res.send({status: 200});
};

const getCurrentMessages = async (req, res) => {
    const event_id = req.params.eventId;
    const room_number = req.params.roomNumber;

    const messages = await ChatMessage.findAll({
        include: [{model: User, as: 'sender', required: false}],
        where: {event_id, room_number},
        order: [['updatedAt', 'ASC']]
    });

    return res.send({status: 200, messages});
};

const eventAuth = async (req, res) => {
    const {eventId} = req.params;
    const {token} = req.body;

    try {
        const data = JSON.parse(Buffer.from(token, 'base64').toString());
        const {userId, secret} = data;

        if (secret !== config.app.CHECK_IN_SECRET) {
            return res.send({status: 403});
        }

        const [user, eventRegistration] = await Promise.all([
            User.findOne({
                where: {user: userId},
                include: [{
                    model: UserTicket,
                    as: 'tickets',
                    where: {event_id: eventId, status: {[Op.in]: [ticketStatuses.active, ticketStatuses.pending]}},
                    required: false
                }]
            }),
            EventRegistration.findOne({where: {event_id: eventId, user_id: userId}})
        ]);

        const invoice = await Invoice.findOne({
            where: {
                event_id: eventId,
                user_id: userId,
                status: invoiceStatuses.pending
            }
        });

        return res.send({status: 200, user: {...user.dataValues, invoice}, eventRegistration});
    } catch (e) {
        logger.warn(e);
        return res.send({status: 403});
    }
};

const completeCancelEvent = async (req, res) => {

    const {secret, event_id} = req.body;

    if (!secret || !event_id) {
        return res.send({status: 400});
    }

    if (secret !== config.app.CHECK_IN_SECRET) {
        return res.send({status: 403});
    }

    const [tickets, eventRegistrations] = await Promise.all([
        UserTicket.findAll({where: {event_id, status: {[Op.not]: ticketStatuses.canceled}}}),
        EventRegistration.findAll({
            include: [{model: Event, required: true}],
            where: {event_id}
        })
    ]);

    if (!tickets.length) return res.send({status: 404, message: 'Tickets not found'});
    if (!eventRegistrations.length) return res.send({status: 404, message: 'Event registrations not found'});

    await Promise.all(tickets.map(async (ticket, index) => {
        const delay = 200 * index;
        setTimeout(async () => {
            const eventRegistration = await EventRegistration.findOne({
                include: [{model: Event, required: true}],
                where: {
                    event_id,
                    user_id: ticket.user_id
                }
            });
            if (ticket.transaction_id && ticket.status === ticketStatuses.active) {
                /* Refund payment */
                const transaction = await Transaction.findOne({where: {'id': ticket.transaction_id}});
                const invoice = await Invoice.findOne({where: {'id': transaction.invoice_id}});
                const eventStartTime = eventRegistration.event.dataValues.start_date_and_time;
                const requested = await refundPayment(invoice, transaction.payment_intent, eventStartTime, transaction.fee, true);

                if (requested) {
                    await ticket.update({status: ticketStatuses.canceled});
                    await eventRegistration.update({status: erStatuses.not_attending});
                }
            } else {
                await ticket.update({status: ticketStatuses.canceled});
                if (eventRegistration) await eventRegistration.update({status: erStatuses.not_attending});
            }
        }, delay);
    }));

    return res.send({status: 200})
};

module.exports = {
    upcomingEvents,
    checkEvent,
    getEvent,
    getRegistrationInfo,
    getActivity,
    getLiveAttendee,
    getCurrentMessages,
    removeEventInfo,
    clearArchivedActivity,
    eventAuth,
    saveEventFeedback,
    completeCancelEvent
};
