// middlewares/adminAuthMiddleware.js
const jwtService = require("@/services/jwt.service");
const { error } = require("@/utils/response");

const adminAuthMiddleware = async (req, res, next) => {
  try {
    if (
      req.originalUrl === "/api/v1/auth/login" ||
      req.originalUrl === "/api/v1/auth/refresh"
    ) {
      return next();
    }

    // Check authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(res, 401, "Token là bắt buộc");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return error(res, 401, "Token không hợp lệ");
    }

    // Verify token và lấy thông tin (bao gồm role)
    const decoded = jwtService.verifyAccessToken(token);

    // Kiểm tra role - chỉ admin/staff mới được truy cập API admin
    if (!["admin", "staff"].includes(decoded.role)) {
      return error(res, 403, "Không có quyền truy cập API quản trị");
    }

    // Gắn thông tin user vào request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.error("Admin auth middleware error:", err);

    if (err.message.includes("hết hạn")) {
      return error(res, 401, "Token đã hết hạn");
    }

    return error(res, 401, "Token không hợp lệ");
  }
};

module.exports = adminAuthMiddleware;
