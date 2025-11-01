// controllers/adminAuth.controller.js
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
const authService = require("@/services/auth.service");

const adminStaffLogin = async (req, res) => {
  try {
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
    return error(res, err.status || 400, err.message, err.errors);
  }
};

module.exports = {
  adminStaffLogin, // Chỉ cần 1 hàm duy nhất
};
