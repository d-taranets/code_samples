const Queue = require('bee-queue');
const wsEvents = require('../../listeners/wsListener');
const config = require('../../config');
const jobs = require('../jobs');
const { logger } = require('../../utils/helpers');

const queueName = jobs.DISCONNECT_TOKBOX_SESSION;

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
    const type = currentSession ? `extended session ${currentSession} end` : `event end`;
    logger.log(`Processed ${eventId}_${queueName} job after ${type}`);
    return await wsEvents.emit('system.disconnect_tokbox_session', {
        eventId
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
            const type = data.current_session ? `extended session ${data.current_session} end` : `event end`;
            logger.log(`Created ${eventId}_${queueName} job for ${type}`);
        });
};

module.exports = {
    addJob
};