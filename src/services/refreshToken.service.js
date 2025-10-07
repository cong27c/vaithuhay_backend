const { RefreshToken } = require("@/models");
const generateToken = require("@/utils/generateToken");
const { REFRESH_TOKEN_EXPIRES_IN } = require("@/config/auth");
const { Op } = require("sequelize");

/**
 * Generate unique refresh token
 * @returns {string} Unique refresh token
 */
const generateUniqueToken = async () => {
  let randToken = null;
  do {
    randToken = generateToken();
  } while (
    await RefreshToken.findOne({
      where: {
        token: randToken,
      },
    })
  );
  return randToken;
};

/**
 * Create refresh token for user
 * @param {number} userId - User ID
 * @returns {Object} RefreshToken instance
 */
const createRefreshToken = async (userId) => {
  const token = await generateUniqueToken();
  console.log("token", token);

  const current = new Date();
  const expiredAt = new Date(
    current.getTime() + REFRESH_TOKEN_EXPIRES_IN * 1000
  );

  return await RefreshToken.create({
    user_id: userId,
    token: token,
    expires_at: expiredAt,
  });
};

/**
 * Find valid refresh token
 * @param {string} token - Refresh token string
 * @returns {Object|null} RefreshToken instance or null
 */
const findValidRefreshToken = async (token) => {
  const found = await RefreshToken.findOne({
    where: {
      token: token,
      expires_at: {
        [Op.gte]: new Date(),
      },
    },
  });

  return found;
};

/**
 * Delete refresh token
 * @param {Object} refreshToken - RefreshToken instance
 */
// refreshToken.service.js
const deleteRefreshToken = async (refreshToken) => {
  if (!refreshToken) return 0;

  // Nếu được truyền instance Sequelize (có dataValues) hoặc object chứa token/id
  if (typeof refreshToken === "object") {
    // instance có .dataValues, plain object có .token hoặc .id
    const tokenValue = refreshToken.token ?? refreshToken.dataValues?.token;
    const idValue = refreshToken.id ?? refreshToken.dataValues?.id;

    if (idValue) {
      // destroy trả về số bản ghi bị xóa
      return await RefreshToken.destroy({ where: { id: idValue } });
    }
    if (tokenValue) {
      return await RefreshToken.destroy({ where: { token: tokenValue } });
    }
    // nếu object mà không có id/token thì trả về 0
    return 0;
  }

  // Nếu truyền chuỗi (token)
  return await RefreshToken.destroy({ where: { token: refreshToken } });
};

module.exports = {
  createRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
};
