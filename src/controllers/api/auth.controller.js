// controllers/adminAuth.controller.js
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
const authService = require("@/services/auth.service");

const adminStaffLogin = async (req, res) => {
  try {
    console.log("chạy vào adminStaffLogin");
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return error(res, 400, "Email và password là bắt buộc");
    }

    // Gọi service login cho cả admin và staff
    const result = await authService.adminStaffLogin(email, password, req);

    return success(res, 200, {
      message: "Đăng nhập thành công",
      ...result,
    });
  } catch (err) {
    console.log(err);
    return error(res, 401, err.message);
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refresh_token;
    const result = await authService.refreshAccessToken(refreshToken);
    // Kiểm tra lại role, chỉ cho phép admin/staff
    if (!["admin", "staff"].includes(result.role)) {
      return error(res, 403, "Không có quyền refresh token admin");
    }
    return success(res, result);
  } catch (err) {
    return error(res, 401, err.message);
  }
};
const adminLogout = async (req, res) => {
  try {
    // Lấy refresh_token từ cookie (BE lưu)
    const refreshToken = req.cookies.refresh_token;

    // Gọi service logout
    const result = await authService.logout(refreshToken);

    // Clear cookie refresh_token ở BE
    res.clearCookie("refresh_token");

    return success(res, 200, {
      message: "Đăng xuất admin thành công",
      success: result,
    });
  } catch (err) {
    console.error("Admin logout error:", err);
    return error(res, 500, "Lỗi khi đăng xuất admin");
  }
};

module.exports = {
  adminStaffLogin, // Chỉ cần 1 hàm duy nhất
  refresh,
  adminLogout,
};
