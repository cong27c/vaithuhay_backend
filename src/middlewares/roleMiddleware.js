// middlewares/roleAuth.middleware.js
const { error } = require("@/utils/response");
const jwtService = require("@/services/jwt.service");

const authenticate = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
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

      // Kiểm tra role nếu có yêu cầu
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return error(res, 403, "Không có quyền truy cập");
      }

      // Gắn thông tin user vào request
      req.user = {
        id: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (err) {
      console.error("Auth middleware error:", err);

      if (err.message.includes("hết hạn")) {
        return error(res, 401, "Token đã hết hạn");
      }

      return error(res, 401, "Token không hợp lệ");
    }
  };
};

// Middleware cụ thể cho từng role
const requireAdmin = authenticate(["admin"]);
const requireStaff = authenticate(["staff"]);
const requireStaffOrAdmin = authenticate(["staff", "admin"]);
const requireCustomer = authenticate(["customer"]);
const requireAuth = authenticate([]); // Chỉ cần đăng nhập

module.exports = {
  authenticate,
  requireAdmin,
  requireStaff,
  requireStaffOrAdmin,
  requireCustomer,
  requireAuth,
};
