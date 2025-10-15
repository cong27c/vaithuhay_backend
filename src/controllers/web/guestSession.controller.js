const guestSessionService = require("@/services/guestSession.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
exports.create = async (req, res) => {
  try {
    const ip = req.ip;
    const userAgent = req.headers["user-agent"];
    const session = await guestSessionService.createGuestSession(ip, userAgent);
    return success(res, 200, { session_id: session.session_id });
  } catch (err) {
    console.error("Create session error:", err);
    return error(res, err.status || 500, err.message);
  }
};
