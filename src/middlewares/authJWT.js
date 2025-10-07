const jwtService = require("@/services/jwt.service");
const response = require("@/utils/response");
const { User, Customer } = require("@/models");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.error(res, 401, "Access token missing");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwtService.verifyAccessToken(token);
    const userId = decoded?.userId;

    if (!userId) throw new Error("id user không hợp lệ");

    // Query user + include customer
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id"], // chỉ lấy customer_id
        },
      ],
    });

    if (!user) {
      return response.error(res, 401, "Người dùng không tồn tại");
    }

    // Gán customerId trực tiếp vào user
    req.user = user.toJSON();
    req.user.customerId = user.customer?.id || null;

    next();
  } catch (err) {
    return response.error(res, 401, "Token không hợp lệ hoặc đã hết hạn");
  }
};

module.exports = authMiddleware;
