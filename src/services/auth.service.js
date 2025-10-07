const { User, Customer } = require("@/models/index");
const { hash, compare } = require("@/utils/bcrypt");
const jwtService = require("./jwt.service");
const refreshTokenService = require("./refreshToken.service");
const { MAIL_SECRET } = require("@/config/auth");
const queue = require("@/utils/queue");

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
    await Customer.create({
      user_id: newUser.id,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
    });

    // 3️⃣ Gửi email xác thực
    queue.dispatch("sendVerifyEmailJob", {
      userId: newUser.id,
      type: "verify",
    });

    // 4️⃣ Trả về thông báo
    return {
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
    };
  } catch (error) {
    console.error("Đăng ký lỗi:", error);
    throw error;
  }
};

const login = async (email, password) => {
  try {
    const user = await User.findOne({ where: { email } });

    if (!user) throw new Error("Thông tin đăng nhập không hợp lệ.");
    if (!user.verified_at) throwError("Email chưa xác thực");

    const isValid = await compare(password, user.dataValues.password);
    if (!isValid) throw new Error("Thông tin đăng nhập không hợp lệ.");

    // Nếu user chưa bật 2FA → cấp token như bình thường
    const tokenData = jwtService.generateAccessToken(user.dataValues.id);
    const refreshToken = await refreshTokenService.createRefreshToken(
      user.dataValues.id
    );

    return {
      ...tokenData,
      refresh_token: refreshToken.token,
    };
  } catch (error) {
    console.log(error);
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

    return {
      ...user.toJSON(),
      customerId: user.customer?.id || null,
    };
  } catch (err) {
    throw err;
  }
};

const logout = async (refreshToken) => {
  const deleted = await refreshTokenService.deleteRefreshToken(refreshToken);
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
