const Queue = require('bee-queue');
const wsEvents = require('../../listeners/wsListener');
const config = require('../../config');
const jobs = require('../jobs');
const { logger } = require('../../utils/helpers');
const {UserSession} = require('../../sequelize');

const queueName = jobs.TRIGGER_RIGHT_FLYIN_POPUP;//deprecated after organizer panel release

const queue = new Queue(queueName, {
    redis: {
        host: config.redis.REDIS_HOST,
        port: config.redis.REDIS_PORT
    },
    isWorker: true,
    activateDelayedJobs: true,
});

queue.process(async (job) => {
    const { event_id: eventId, current_session: currentSession } = job.data.data;
    const sessionUsersIds = (await UserSession.findAll({
        where: {
            event_id: eventId,
        },
        attributes: ['user_id'],
    })).map((userSession) => (userSession.user_id));

    logger.log(`Processed ${eventId}_${queueName} job for session: ${currentSession}`);
    return await wsEvents.emit('onPopupTrigger', {
        eventId,
        type: 'right-fly-in',
        sessionUsersIds
    });
});

queue.on('succeeded', async (job, result) => {
    return await wsEvents.emit('management.jobs_updated', {
        eventId: job.data.data.event_id
    });
});

const addJob = (data) => {
    const eventId = data.event_id;
    data.queueName = queueName;

    queue.createJob({data})
        .delayUntil(data.date)
        .retries(1)
        .save()
        .then((job) => {
            logger.log(`Created ${eventId}_${queueName} job for session: ${data.current_session}`);
        });
};

module.exports = {
    addJob
};
