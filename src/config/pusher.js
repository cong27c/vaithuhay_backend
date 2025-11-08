require("dotenv").config();
const Pusher = require("pusher");
console.log("PUSHER_APP_ID", process.env.PUSHER_APP_ID);
console.log("PUSHER_APP_KEY", process.env.PUSHER_APP_KEY);
console.log("PUSHER_APP_SECRET", process.env.PUSHER_APP_SECRET);
console.log("PUSHER_APP_CLUSTER", process.env.PUSHER_APP_CLUSTER);
console.log("PUSHER_HOST", process.env.PUSHER_HOST);
console.log("PUSHER_PORT", process.env.PUSHER_PORT);
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  host: process.env.PUSHER_HOST,
  port: process.env.PUSHER_PORT,
  useTLS: process.env.PUSHER_USE_TLS === "true",
});

module.exports = pusher;
