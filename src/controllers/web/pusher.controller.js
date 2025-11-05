const pusherService = require("@/services/pusher.service");

const pusherAuth = async (req, res) => {
  console.log(req.body);
  const { socket_id, channel_name } = req.body;
  const customerId = req.user?.customerId || null;
  let sessionId;
  if (!customerId) {
    sessionId = req.guestSession?.id;
    if (!sessionId) {
      throwError(401, "Session ID required for guest users");
    }
  }
  console.log("customerId", customerId);
  console.log("sessionId", sessionId);
  try {
    const auth = await pusherService.authenticateChannel(
      socket_id,
      channel_name,
      customerId,
      sessionId
    );

    res.json(auth);
  } catch (err) {
    console.error("Pusher auth error:", err);
    res
      .status(err.status || 500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

module.exports = { pusherAuth };
