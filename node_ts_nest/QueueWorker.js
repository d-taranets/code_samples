import Queue from 'bee-queue';
import redisConf from '../../config/redis';
import { PG_CHANGES as POOL } from '../../../shared/constants/queue';
import { handleDataChanges } from "../../utils/db-changes-handler";

const queue = new Queue(POOL, {
    redis: {
        host: redisConf.host,
        port: redisConf.port,
    },
    isWorker: true,
});

queue.process(async ({data: { table, event, rows }}) => {
    try {
        await handleDataChanges(table, event, rows);
    } catch (e) {
        console.log(e)
    }
    return 'Successfully finished';
});

queue.on('succeeded', (job) => {
    queue.removeJob(job.id);
});

export const pushToQueue = (data) => {
    const job = queue
        .createJob(data);

    job
        .timeout(10000)
        .retries(3)
        .save()
};

export default queue;