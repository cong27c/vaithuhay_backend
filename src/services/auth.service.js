const {
  User,
  Customer,
  Cart,
  RefreshToken,
  sequelize,
} = require("@/models/index");
const { hash, compare } = require("@/utils/bcrypt");
const jwtService = require("./jwt.service");
const refreshTokenService = require("./refreshToken.service");
const { MAIL_SECRET } = require("@/config/auth");
const queue = require("@/utils/queue");
const throwError = require("@/utils/throwError");
const mergeGuestDataToCustomerService = require("./mergeGuestDataToCustomer.service");
const { Op } = require("sequelize");

const register = async (data, res) => {
  try {
    const newUser = await User.create({
      email: data.email,
      password: await hash(data.password),
      first_name: data.firstName,
      last_name: data.lastName,
      username: data.email?.split("@")[0],
      role: data.role || "customer",
    });

    let newCustomer = null;
    let newCart = null;

    if (!data.role || data.role === "customer") {
      newCustomer = await Customer.create({
        user_id: newUser.id,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
      });

      if (!newCustomer?.id) {
        throw new Error("Không thể tạo customer.");
      }

      newCart = await Cart.create({
        customer_id: newCustomer.id,
        status: "active",
        total_amount: 0,
      });
      console.log(`Đã tạo cart #${newCart.id} cho customer #${newCustomer.id}`);
    }

    // Gửi email xác thực
    queue.dispatch("sendVerifyEmailJob", {
      userId: newUser.id,
      type: "verify",
    });

    return {
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
      userId: newUser.id,
      role: newUser.role,
      ...(newUser.role === "customer" && {
        customerId: newCustomer?.id,
        cartId: newCart?.id,
      }),
    };
  } catch (error) {
    console.error("Đăng ký lỗi:", error);
    throw error;
  }
};

const login = async (email, password, req, requiredRole = null) => {
  try {
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id"],
          required: false, // Left join để staff/admin không bị lỗi
        },
      ],
    });

    if (!user) throw new Error("Thông tin đăng nhập không hợp lệ.");
    if (!user.verified_at) throw new Error("Email chưa xác thực.");

    // Kiểm tra role nếu có yêu cầu
    if (requiredRole && user.role !== requiredRole) {
      throwError("Tài khoản không có quyền truy cập vào khu vực này.", 403);
    }

    const isValid = await compare(password, user.password);
    if (!isValid) throw new Error("Thông tin đăng nhập không hợp lệ.");

    const tokenData = jwtService.generateAccessToken(user.id, user.role);
    const refreshToken = await refreshTokenService.createRefreshToken(user.id);

    // Chỉ merge guest data cho customer
    if (req.guestSession && user.role === "customer") {
      let customerId = user.customer?.id;

      if (!customerId) {
        const newCustomer = await Customer.create({ user_id: user.id });
        customerId = newCustomer.id;
      }

      if (!req.guestSession.customer_id) {
        req.guestSession.customer_id = customerId;
        await req.guestSession.save();
      }

      await mergeGuestDataToCustomerService.mergeGuestDataToCustomer(
        req.guestSession.id,
        customerId
      );
    }

    return {
      ...tokenData,

      refresh_token: refreshToken.token,
      role: user.role, // Trả về role
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

const adminStaffLogin = async (email, password, req) => {
  try {
    // 1️⃣ Tìm user theo email
    const user = await User.findOne({
      where: { email },
    });

    if (!user) throwError("Thông tin đăng nhập không hợp lệ.", 401);
    if (!user.verified_at) throwError("Email chưa xác thực.", 401);

    // 2️⃣ Chỉ cho phép admin và staff login
    if (!["admin", "staff"].includes(user.role)) {
      throwError(
        "Tài khoản không có quyền truy cập vào khu vực quản trị.",
        403
      );
    }

    // 3️⃣ Kiểm tra password
    const isValid = await compare(password, user.password);
    if (!isValid) throwError("Thông tin đăng nhập không hợp lệ.", 401);

    // 4️⃣ Cấp token VỚI ROLE
    const tokenData = jwtService.generateAccessToken(user.id, user.role);
    const refreshToken = await refreshTokenService.createRefreshToken(user.id);

    return {
      ...tokenData,
      refresh_token: refreshToken.token,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Admin/Staff login error:", error);
    throw error;
  }
};

const verify = async (token) => {
  try {
    if (!token) {
      throw new Error("Token không tồn tại hoặc đã hết hạn");
    }
    const { userId } = jwtService.verifyAccessToken(token, MAIL_SECRET);

    const user = await User.findOne({
      where: { id: userId },
    });

    user.verified_at = Date.now();

    await user.save();

    return user;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

const checkEmailExists = async (email) => {
  const user = await User.findOne({
    where: { email },
  });

  return !!user;
};

const getCurrentUser = async (req) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) throw new Error("Không tìm thấy Authorization header");

    const token = authHeader.split(" ")[1];
    if (!token) throw new Error("Token không hợp lệ");

    const { userId } = jwtService.verifyAccessToken(token);

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "email",
        "first_name",
        "last_name",
        "username",
        "verified_at",
        "phone",
        "role", // Thêm role
      ],
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id"],
          required: false, // Left join
        },
      ],
    });

    if (!user) throw new Error("Người dùng không tồn tại");

    let cartId = null;

    // Chỉ tìm cart nếu là customer
    if (user.role === "customer" && user.customer?.id) {
      try {
        const cart = await Cart.findOne({
          where: { customer_id: user.customer.id },
          attributes: ["id"],
          order: [["created_at", "DESC"]],
        });
        cartId = cart?.id || null;
      } catch (cartError) {
        console.error("Lỗi khi tìm giỏ hàng:", cartError);
      }
    }

    return {
      ...user.toJSON(),
      customerId: user.customer?.id || null,
      cartId,
    };
  } catch (err) {
    throw err;
  }
};

const logout = async (refreshToken) => {
  try {
    // Cho phép logout an toàn kể cả khi token đã bị xóa
    if (!refreshToken) return true;

    const deleted = await refreshTokenService.deleteRefreshToken(refreshToken);

    // Cleanup nhẹ (xóa token hết hạn)
    await RefreshToken.destroy({
      where: { expires_at: { [Op.lt]: new Date() } },
    });

    return deleted > 0;
  } catch (err) {
    console.error("Lỗi khi logout:", err);
    return false;
  }
};

const refreshAccessToken = async (refreshTokenString) => {
  if (!refreshTokenString) throw new Error("Thiếu refresh token.");

  const refreshToken = await refreshTokenService.findValidRefreshToken(
    refreshTokenString
  );
  if (!refreshToken) {
    throw new Error("Refresh token không hợp lệ.");
  }

  // Lấy user để lấy role
  const user = await User.findByPk(refreshToken.user_id);
  if (!user) {
    throw new Error("Người dùng không tồn tại.");
  }

  // Tạo access token mới VỚI ROLE
  const tokenData = jwtService.generateAccessToken(user.id, user.role);

  const transaction = await sequelize.transaction();
  try {
    await refreshTokenService.deleteRefreshToken(refreshToken, { transaction });
    const newRefreshToken = await refreshTokenService.createRefreshToken(
      user.id,
      { transaction }
    );
    await transaction.commit();

    return {
      ...tokenData,
      refresh_token: newRefreshToken.token,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const forgotPassword = async (email) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Thông tin không hợp lệ.");
    }
    const userId = user.id;
    queue.dispatch("sendVerifyEmailJob", { userId, type: "forgot-password" });

    return { message: "Đã gửi email xác minh, vui lòng kiểm tra hộp thư." };
  } catch (err) {
    console.log(err);
  }
};

const resetPassword = async (token, newPassword) => {
  try {
    const { userId } = jwtService.verifyAccessToken(token, MAIL_SECRET);

    const user = await User.findOne({
      where: { id: userId },
    });
    // password: await hash(data.password),
    const hashNewPassword = await hash(newPassword);

    await User.update({ password: hashNewPassword }, { where: { id: userId } });

    return { message: "Đổi mật khẩu thành công" };
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

const verifyEmail = async (email) => {
  // Kiểm tra email
  const user = await User.findOne({ where: { email } });
  if (!user) throwError("Email không tồn tại.", 404);

  // Kiểm tra trạng thái xác minh
  if (user.verified_at) {
    throwError("Email này đã được xác minh.", 400);
  }

  // Gửi job xác minh
  await queue.dispatch("sendVerifyEmailJob", {
    userId: user.id,
    type: "verify",
  });

  return { message: "Đã gửi email xác minh, vui lòng kiểm tra hộp thư." };
};

module.exports = {
  logout,
  getCurrentUser,
  checkEmailExists,
  refreshAccessToken,
  login,
  register,
  verify,
  verifyEmail,
  forgotPassword,
  resetPassword,
  adminStaffLogin,
};
