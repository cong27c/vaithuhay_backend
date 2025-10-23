const express = require("express");
const router = express.Router({ mergeParams: true });

router.post("/pusher/auth", (req, res) => {
  const socketId = req.body.socket_id;
  const channelName = req.body.channel_name;

  const userId = req.user?.id;
  if (!userId) {
    return res.status(403).send("Unauthorized");
  }

  const auth = pusher.authenticate(socketId, channelName);
  res.send(auth);
});
module.exports = router;
