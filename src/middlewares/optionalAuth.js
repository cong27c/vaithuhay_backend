const jwtService = require("@/services/jwt.service");
const { User, Customer } = require("@/models");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  req.user = null; // mặc định

  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwtService.verifyAccessToken(token);
    const userId = decoded?.userId;
    if (!userId) return next();

    const user = await User.findOne({
      where: { id: userId },
      include: [{ model: Customer, as: "customer", attributes: ["id"] }],
    });

    if (!user) return next();

    req.user = user.toJSON();
    req.user.customerId = user.customer?.id || null;
  } catch (err) {
    // Token invalid → coi như chưa login
    req.user = null;
  }

  next();
};
