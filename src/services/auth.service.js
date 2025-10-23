const { User, Customer, Cart } = require("@/models/index");
const { hash, compare } = require("@/utils/bcrypt");
const jwtService = require("./jwt.service");
const refreshTokenService = require("./refreshToken.service");
const { MAIL_SECRET } = require("@/config/auth");
const queue = require("@/utils/queue");
const throwError = require("@/utils/throwError");
const mergeGuestDataToCustomerService = require("./mergeGuestDataToCustomer.service");

const register = async (data, res) => {
  try {
    // 1️⃣ Tạo user mới
    const newUser = await User.create({
      email: data.email,
      password: await hash(data.password),
      first_name: data.firstName,
      last_name: data.lastName,
      username: data.email?.split("@")[0],
    });

    if (!newUser?.id) {
      throw new Error("Không thể tạo người dùng.");
    }

    // 2️⃣ Tạo customer tương ứng
    const newCustomer = await Customer.create({
      user_id: newUser.id,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
    });

    if (!newCustomer?.id) {
      throw new Error("Không thể tạo customer.");
    }

    // 3️⃣ Tạo cart cho customer
    const newCart = await Cart.create({
      customer_id: newCustomer.id,
      // Có thể thêm các trường mặc định khác nếu cần
      status: "active",
      total_amount: 0,
    });

    console.log(`Đã tạo cart #${newCart.id} cho customer #${newCustomer.id}`);

    // 4️⃣ Gửi email xác thực
    queue.dispatch("sendVerifyEmailJob", {
      userId: newUser.id,
      type: "verify",
    });

    // 5️⃣ Trả về thông báo
    return {
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
      userId: newUser.id,
      customerId: newCustomer.id,
      cartId: newCart.id,
    };
  } catch (error) {
    console.error("Đăng ký lỗi:", error);
    throw error;
  }
};

const login = async (email, password, req) => {
  try {
    // 1️⃣ Tìm user theo email
    const user = await User.findOne({
      where: { email },
      include: [{ model: Customer, as: "customer", attributes: ["id"] }],
    });

    if (!user) throw new Error("Thông tin đăng nhập không hợp lệ.");
    if (!user.verified_at) throw new Error("Email chưa xác thực.");

    // 2️⃣ Kiểm tra password
    const isValid = await compare(password, user.password);
    if (!isValid) throw new Error("Thông tin đăng nhập không hợp lệ.");

    // 3️⃣ Cấp access token và refresh token
    const tokenData = jwtService.generateAccessToken(user.id);
    const refreshToken = await refreshTokenService.createRefreshToken(user.id);

    // 4️⃣ Nếu có guestSession → merge data
    if (req.guestSession) {
      let customerId = user.customer?.id;

      // Nếu user chưa có customer → tạo mới
      if (!customerId) {
        const newCustomer = await Customer.create({ user_id: user.id });
        customerId = newCustomer.id;
      }

      // Nếu guestSession chưa gắn customer → cập nhật
      if (!req.guestSession.customer_id) {
        req.guestSession.customer_id = customerId;
        await req.guestSession.save();
      }

      // 5️⃣ Gộp dữ liệu guest → customer
      await mergeGuestDataToCustomerService.mergeGuestDataToCustomer(
        req.guestSession.id,
        customerId
      );
    }

    // ✅ Trả về token
    return {
      ...tokenData,
      refresh_token: refreshToken.token,
    };
  } catch (error) {
    console.error("Login error:", error);
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
      ],
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id"], // chỉ lấy customer_id
        },
      ],
    });

    if (!user) throw new Error("Người dùng không tồn tại");

    let cartId = null;

    // Nếu user có customer, tìm cartId tương ứng
    if (user.customer?.id) {
      try {
        const cart = await Cart.findOne({
          where: {
            customer_id: user.customer.id,
            // Có thể thêm các điều kiện khác nếu cần, ví dụ:
            // status: 'active'
          },
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
  // 🌀 Bước 1: merge dữ liệu customer → guest
  const deleted = await refreshTokenService.deleteRefreshToken(refreshToken);

  // 2️⃣ Sau đó mới merge dữ liệu xuống guest (nếu có)

  return deleted > 0;
};

const refreshAccessToken = async (refreshTokenString) => {
  const refreshToken = await refreshTokenService.findValidRefreshToken(
    refreshTokenString
  );
  if (!refreshToken) {
    throw new Error("Refresh token không hợp lệ");
  }

  const tokenData = jwtService.generateAccessToken(refreshToken.user_id);

  await refreshTokenService.deleteRefreshToken(refreshToken);

  const newRefreshToken = await refreshTokenService.createRefreshToken(
    refreshToken.user_id
  );

  return {
    ...tokenData,
    refresh_token: newRefreshToken.token,
  };
};

const forgotPassword = async (email) => {
  try {
    const { dataValues: user } = await User.findOne({ where: { email } });
    const userId = user.id;
    if (!user) {
      throw new Error("Thông tin không hợp lệ.");
    }
    queue.dispatch("sendVerifyEmailJob", { userId, type: "forgot-password" });
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

    return user;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

module.exports = {
  logout,
  getCurrentUser,
  checkEmailExists,
  refreshAccessToken,
  login,
  register,
  verify,
  forgotPassword,
  resetPassword,
};
