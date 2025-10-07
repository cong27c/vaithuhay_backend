const sendVerifyEmailJob = require("../jobs/sendVerifyEmailJob");
const { Queue } = require("../models");
const handlers = {
  sendVerifyEmailJob,
};
async function jobProcess(job) {
  const handler = handlers[job.type];
  if (handler) {
    try {
      await Queue.update({ status: "processing" }, { where: { id: job.id } });
      await handler(job);
      await Queue.update({ status: "completed" }, { where: { id: job.id } });
    } catch (error) {
      const retries = job.retries_count || 0;
      const maxRetries = job.max_retries || 5;

      if (retries < maxRetries) {
        await Queue.update(
          {
            status: "pending",
            retries_count: retries + 1,
          },
          { where: { id: job.id } }
        );
        console.log(
          `Job ${job.id} failed. Retrying (${retries + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        await Queue.update({ status: "rejected" }, { where: { id: job.id } });
        console.log(`Job ${job.id} failed after max retries.`);
      }
    }
  }
}

async function queueWorker() {
  while (true) {
    const jobs = await Queue.findAll({
      where: {
        status: "pending",
      },
    });
    for (let job of jobs) {
      await jobProcess(job);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

queueWorker();
