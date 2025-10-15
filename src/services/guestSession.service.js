const { nanoid } = require("nanoid");
const { GuestSession } = require("../models");

exports.createGuestSession = async (ip, userAgent) => {
  const session_id = "GUEST_" + nanoid(16);
  const session = await GuestSession.create({
    session_id,
    ip_address: ip,
    user_agent: userAgent,
  });
  return session;
};
