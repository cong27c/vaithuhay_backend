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
    origin: ["http://localhost:5173", "https://covaithuhay.io.vn"], // thêm domain production
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Start server
app.listen(port, () => {
  console.log(`🚀 Server đang chạy trên port ${port}`);
});
