const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN, TOKEN_TYPE } = require("@/config/auth");
const { MAIL_SECRET, MAIL_EXPIRES_IN } = require("../config/auth");

/**
 * Generate access token for user
 * @param {number} userId - User ID
 * @returns {Object} Token object with access_token, token_type, expires_in
 */
const generateAccessToken = (
  userId,
  jwtSecret = JWT_SECRET,
  expires = JWT_EXPIRES_IN
) => {
  const token = jwt.sign({ userId }, jwtSecret, {
    expiresIn: expires,
  });

  return {
    access_token: token,
    token_type: TOKEN_TYPE,
    expires_in: JWT_EXPIRES_IN,
  };
};

const generatePreorderToken = (payload) => {
  return jwt.sign(payload, MAIL_SECRET, { expiresIn: MAIL_EXPIRES_IN });
};

const verifyPreorderToken = (token) => {
  try {
    return jwt.verify(token, MAIL_SECRET);
  } catch (err) {
    return null;
  }
};
const generateUpdateEmailToken = (
  userId,
  email,
  secret = MAIL_SECRET,
  expires = JWT_EXPIRES_IN
) => {
  const token = jwt.sign({ userId, email }, secret, { expiresIn: expires });

  return {
    access_token: token,
    token_type: TOKEN_TYPE,
    expires_in: JWT_EXPIRES_IN,
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyAccessToken = (token, jwtSecret = JWT_SECRET) => {
  return jwt.verify(token, jwtSecret);
};

module.exports = {
  generateUpdateEmailToken,
  generateAccessToken,
  verifyAccessToken,
  generatePreorderToken,
  verifyPreorderToken,
};
