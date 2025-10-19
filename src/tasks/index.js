const preorderMailTask = require("./preorderMailTask");
const scheduleJob = require("@/utils/scheduler.js");

// Tạo cron job mỗi phút
scheduleJob("preorderMail", "* * * * *", preorderMailTask);
