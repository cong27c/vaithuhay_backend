// guestSession.middleware.js
const { GuestSession, Customer } = require("@/models");
const { v4: uuidv4 } = require("uuid");
const { SESSION_ID_EXPIRES_IN } = require("@/config/auth");

module.exports = async (req, res, next) => {
  try {
    let sessionId = req.cookies.session_id;
    const ipAddress = (
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      ""
    )
      .split(",")[0]
      .trim();
    const userAgent = req.headers["user-agent"];
    let guestSession;

    if (sessionId) {
      guestSession = await GuestSession.findOne({
        where: { session_id: sessionId },
      });
      if (guestSession) {
        // luôn gia hạn mỗi lần có request
        guestSession.expires_at = new Date(
          Date.now() + SESSION_ID_EXPIRES_IN * 1000
        );
        await guestSession.save();
      }
    }

    if (!guestSession) {
      sessionId = uuidv4();
      guestSession = await GuestSession.create({
        session_id: sessionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: new Date(Date.now() + SESSION_ID_EXPIRES_IN * 1000),
      });
    }

    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_ID_EXPIRES_IN * 1000,
    });

    req.guestSession = guestSession;

    if (req.user && !guestSession.customer_id) {
      try {
        let customerId = req.user.customerId;
        if (!customerId) {
          const newCustomer = await Customer.create({ user_id: req.user.id });
          customerId = newCustomer.id;
          req.user.customerId = customerId;
        }
        guestSession.customer_id = customerId;
        await guestSession.save();
      } catch (error) {
        console.error("guestSession: failed to sync customer", error);
      }
    }

    next();
  } catch (err) {
    console.error("guestSessionMiddleware error:", err);
    next(err);
  }
};
