const cron = require("node-cron");

const activeTasks = {};

function scheduleJob(name, cronTime, handler) {
  if (activeTasks[name]) {
    return console.log(`Task name ${name} already exists, cancelled`);
  }

  const task = cron.schedule(cronTime, () => {
    try {
      handler();
    } catch (error) {
      console.log(error);
    }
  });
  activeTasks[name] = task;
}

module.exports = scheduleJob;
