require("module-alias/register");
require("dotenv").config();

const express = require("express");
const webRouter = require("@/routes/web/index");
const apiRouter = require("@/routes/api/index");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const guestSessionMiddleware = require("@/middlewares/guestSessionMiddleware");
const optionalAuth = require("@/middlewares/optionalAuth");
const adminAuthMiddleware = require("@/middlewares/adminAuthMiddleware");

// Sequelize
const { sequelize } = require("@/models");
const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const app = express();
const port = 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://api.covaithuhay.io.vn"], // thêm domain production
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

// Middlewares
app.use("/", optionalAuth);
app.use("/", guestSessionMiddleware);
app.use("/api/v1", adminAuthMiddleware);

// Routes
app.use("/", webRouter);
app.use("/api/v1", apiRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Crawler status endpoint
app.get("/crawler-status", async (req, res) => {
  try {
    const status = await sequelize.query(
      `SELECT * FROM crawler_status WHERE crawler_name = 'all_crawlers'`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: status[0] || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server đang chạy trên port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔍 Crawler status: http://localhost:${port}/crawler-status`);
});
