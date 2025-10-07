const authService = require("@/services/auth.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

const register = async (req, res) => {
  try {
    const result = await authService.register(req.body, res);
    return success(res, 201, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const login = async (req, res) => {
  try {
    const tokenData = await authService.login(
      req.body.email,
      req.body.password
    );

    res.cookie("refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: false, // HTTPS
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      path: "/",
    });

    delete tokenData.refresh_token;
    return success(res, 200, { access_token: tokenData.access_token });
  } catch (err) {
    return error(res, 401, err.message);
  }
};

const verify = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await authService.verify(token);

    return success(res, 200, { message: "Xác thực thành công", user });
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return throwError(res, 400, "Email là bắt buộc");
    }

    const exists = await authService.checkEmailExists(email);

    return success(res, 200, { exists }, "Check email thành công");
  } catch (err) {
    console.error("Lỗi check email:", err);
    return error(res, 500, "Lỗi server", err.message);
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req);
    return success(res, 200, user);
  } catch (err) {
    return error(res, 401, err.message);
  }
};

const logout = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) return error(res, 400, "Refresh token required");
  try {
    const result = await authService.logout(refreshToken);
    if (!result) return error(res, 400, "Invalid refresh token");
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: false, // nếu bạn dùng https
      sameSite: "Strict",
    });
    return success(res, 201);
  } catch (err) {
    console.log(err);
    return error(res, 500, "Internal server error");
  }
};

const refreshToken = async (req, res) => {
  try {
    // LẤY refresh_token TỪ COOKIE
    const refreshToken = req.cookies.refresh_token;

    console.log("refreshToken", refreshToken);
    if (!refreshToken) {
      return error(res, 401, "Refresh token is missing");
    }

    const tokenData = await authService.refreshAccessToken(refreshToken);

    // 🛠️ Set lại cookie mới
    res.cookie("refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: false, // hoặc true nếu dùng HTTPS
      sameSite: "Lax",
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      path: "/",
    });

    // Xoá refresh_token khỏi response trả về (nếu không muốn expose)
    delete tokenData.refresh_token;

    return success(res, 200, tokenData);
  } catch (err) {
    console.log(err);
    return error(res, 401, err.message);
  }
};

const sendForgotEmail = async (req, res) => {
  try {
    authService.forgotPassword(req.body.email);
    res.status(200).send("");
  } catch (error) {
    throw new Error(error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password, token } = req.body;
    if (!token) {
      return error(res, 400, "Token không được để trống");
    }
    authService.resetPassword(token, password);

    res.status(200).send("");
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  refreshToken,
  register,
  verify,
  checkEmailExists,
  login,
  getCurrentUser,
  logout,
  sendForgotEmail,
  resetPassword,
};
