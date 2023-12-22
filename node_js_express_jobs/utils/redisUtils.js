const config = require('../config');
const redis = require("redis");
const client = redis.createClient({
    host: config.redis.REDIS_HOST,
    port: config.redis.REDIS_PORT
});
const jobs = require('../jobs/jobs');
const { logger } = require('./helpers');

const addUser = async (data) => {
    logger.log(`add ${data.redisKey}`);
    const stored = client.hmset(data.redisKey, data.redisData);
    if (!stored) {
        logger.error(`unable to store user: [${data.userId}] to redis`);
    }

    client.expire(data.redisKey, 10800);

    client.sadd(data.userId, data.socketId);
    client.expire(data.userId, 10800);

    return true;
};

const removeUser = async (data) => {
    const result = client.del(data.redisKey);

    client.srem(data.userId, data.socketId);
    const connectionIds = await sMembersAsync(data.userId);

    if (connectionIds.length > 0) {
        logger.error(`removeUser is not in pair with addUser... possible Holding issue! user: [${data.userId}]`);
    }

    return result;
};

const sMembersAsync = async (set) => {
    return new Promise((resolve, reject) => {
        client.smembers(set, (err, value) => {
            if (err) {
                reject(err);
            }
            resolve(value);
        });
    });
};

eventJobExist = async (eventId, job, scheduledTime) => {
    const jobs = await getDelayedJobs(eventId, job);
    return jobs ? !!Object.values(jobs).filter(value => {
        const jobObj = JSON.parse(value);
        return jobObj.data.data.date === scheduledTime
    }).length : false;
};

const getEventJobs = async(eventId) => {
    const eventJobs = {};
    for (let job in jobs) {
        const delayedJobs = await getDelayedJobs(eventId, job);
        const eventDelayedJobs = delayedJobs ? Object.values(delayedJobs).filter(value => value.indexOf(`${eventId}`) !== -1) : [];
        eventJobs[job] = eventDelayedJobs.length ? eventDelayedJobs
            .map(value => {
                const jobObj = JSON.parse(value);
                return {
                    session: jobObj.data.data.current_session,
                    scheduledTime: jobObj.data.data.date,
                    status: jobObj.status
                }
            }) : null;
    }

    return eventJobs
};

const getDelayedJobs = async (eventId, job) => {
    return await new Promise ((resolve) => client.hgetall(`bq:${job}:jobs`, (err, result) => resolve(result ? result : null)));
};

const clearRedis = async (eventId) => {
    return await Promise.all(Object.keys(jobs).map(async job => {
        const eventJobs = await getDelayedJobs(eventId, job);
        const ids = eventJobs ? Object.keys(eventJobs).filter(key => eventJobs[key].indexOf(`${eventId}`) !== -1) : [];
        if (ids.length) {
            await client.hdel(`bq:${job}:jobs`, ids);
            await client.srem(`bq:${job}:succeeded`, ids);
            await client.srem(`bq:${job}:failed`, ids);
            await client.srem(`bq:${job}:stalling`, ids);
            await client.zrem(`bq:${job}:delayed`, ids);
            await Promise.all(ids.map(val => client.lrem(`bq:${job}:active`, [1, val])));
            await Promise.all(ids.map(val => client.lrem(`bq:${job}:waiting`, [1, val])));
        }
    }));
};

const removeKey = async (key) => await client.del(key);

const getUser = (data) => new Promise((resolve, reject) => {
    const cb = function(err, reply) {
        if (err) {
            reject(err)
        }
        resolve(reply === 1)
    };
    client.exists(`${data.event_id}_${data.user_id}`, cb);
});

const storeRedisData = (key, value, expire) => {
    logger.log(`add ${key}`);
    client.set(key, JSON.stringify(value), redis.print);
    client.expire(key, expire);

    return true;
};

const getRedisData = async (key) => {
    return await new Promise ((resolve) => {
        client.get(key, (err, result) => {
            return resolve(result ? result : null)
        })
    });
};

module.exports = {
    addUser,
    removeUser,
    getUser,
    clearRedis,
    getEventJobs,
    removeKey,
    eventJobExist,
    storeRedisData,
    getRedisData
};
