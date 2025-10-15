// middlewares/optionalAuth.js
const jwtService = require("@/services/jwt.service");
const { User, Customer } = require("@/models");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Nếu không có token -> cho qua, gán user = null
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwtService.verifyAccessToken(token);
    const userId = decoded?.userId;

    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id"],
        },
      ],
    });

    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user.toJSON();
    req.user.customerId = user.customer?.id || null;

    next();
  } catch (err) {
    // Token không hợp lệ cũng không lỗi -> chỉ coi là chưa đăng nhập
    req.user = null;
    next();
  }
};
