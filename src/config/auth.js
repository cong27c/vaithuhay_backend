const rawRefreshExpires = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN, 10);
const REFRESH_TOKEN_EXPIRES_IN = isNaN(rawRefreshExpires)
  ? 30 * 24 * 60 * 60
  : rawRefreshExpires;

module.exports = {
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "835fb85dbd6a6e937479de267dccc88dc31c3b80757301a109d9d3b79427b783",
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN, 10) || 3000, // seconds
  REFRESH_TOKEN_EXPIRES_IN,
  TOKEN_TYPE: process.env.TOKEN_TYPE || "Bearer",
  MAIL_SECRET:
    process.env.MAIL_SECRET ||
    "835fb85dbd6a6e937123213cc88dc31c3b80757301a109d9d3b79427b783",
  MAIL_EXPIRES_IN: parseInt(process.env.MAIL_EXPIRES_IN, 10) || 2000,
};
