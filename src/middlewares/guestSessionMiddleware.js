const { GuestSession } = require("@/models");
const { v4: uuidv4 } = require("uuid");
const { SESSION_ID_EXPIRES_IN } = require("@/config/auth");

module.exports = async (req, res, next) => {
  try {
    let sessionId = req.cookies.session_id;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    let guestSession;

    if (sessionId) {
      guestSession = await GuestSession.findOne({
        where: { session_id: sessionId },
      });

      // Nếu còn session → check expires
      if (guestSession) {
        const now = Date.now();
        const remaining = new Date(guestSession.expires_at) - now;
        if (remaining < 2 * 24 * 60 * 60 * 1000) {
          // < 2 ngày
          guestSession.expires_at = new Date(
            now + SESSION_ID_EXPIRES_IN * 1000
          );
          await guestSession.save();
        }
      }
    }

    // Nếu chưa có session → tạo mới
    if (!guestSession) {
      sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + SESSION_ID_EXPIRES_IN * 1000);

      guestSession = await GuestSession.create({
        session_id: sessionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
      });
    }

    // Gắn cookie (chuẩn hóa)
    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_ID_EXPIRES_IN * 1000,
    });

    // Gắn vào req
    req.guestSession = guestSession;

    // Đồng bộ guest → customer nếu user login và chưa gắn
    if (req.user && !guestSession.customer_id) {
      guestSession.customer_id = req.user.id;
      await guestSession.save();
    }

    next();
  } catch (err) {
    console.error("guestSessionMiddleware error:", err);
    next(err);
  }
};
