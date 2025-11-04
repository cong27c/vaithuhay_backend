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

// Crawlers
const { crawlCollections } = require("@/crawler/collectionsTable");
const { crawlCombos } = require("@/crawler/combo");
const { crawlProducts } = require("@/crawler/productsTable");
const { crawlProductDetail } = require("@/crawler/productDetailsTable");
const productDiscountsTable = require("@/crawler/productDiscountsTable");
const productImagesTable = require("@/crawler/productImagesTable");
const { crawlProductVariants } = require("@/crawler/productVariantsTable");
const crawlBlogProducts = require("@/crawler/blogProducts");
const crawlBlogSystems = require("@/crawler/blogSystem");

// Sequelize
const { sequelize } = require("@/models");
const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const app = express();
const port = 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

// Retry utility
async function retryOperation(operation, maxRetries = 3, initialDelay = 5000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Thử lại lần ${attempt}/${maxRetries}...`);
      }
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(
          `⏳ Chờ ${delay / 1000}s trước khi thử lại... (Lỗi: ${error.message})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`❌ Thất bại sau ${maxRetries} lần thử:`, lastError.message);
  throw lastError;
}

function withTimeout(operation, timeoutMs = 60000) {
  return Promise.race([
    operation(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Hàm chạy tất cả crawlers theo thứ tự với retry mechanism
 */
async function runAllCrawlers() {
  console.log("🚀 Bắt đầu crawl tất cả dữ liệu theo thứ tự...");

  const crawlers = [
    { name: "collections", fn: crawlCollections, retry: true, timeout: 120000 },
    { name: "products", fn: crawlProducts, retry: true, timeout: 300000 },
    { name: "combos", fn: crawlCombos, retry: true, timeout: 180000 },
    {
      name: "product details",
      fn: crawlProductDetail,
      retry: true,
      timeout: 240000,
    },
    {
      name: "product discounts",
      fn: productDiscountsTable,
      retry: true,
      timeout: 180000,
    },
    {
      name: "product images",
      fn: productImagesTable,
      retry: true,
      timeout: 240000,
    },
    {
      name: "product variants",
      fn: crawlProductVariants,
      retry: true,
      timeout: 180000,
    },
    {
      name: "blog products",
      fn: crawlBlogProducts,
      retry: true,
      timeout: 120000,
    },
    {
      name: "blog systems",
      fn: crawlBlogSystems,
      retry: true,
      timeout: 120000,
    },
  ];

  for (const [index, crawler] of crawlers.entries()) {
    console.log(`\n📁 ${index + 1}. Crawl ${crawler.name}...`);

    try {
      if (crawler.retry) {
        await retryOperation(
          () => withTimeout(crawler.fn, crawler.timeout),
          3, // maxRetries
          5000 // initialDelay
        );
      } else {
        await withTimeout(crawler.fn, crawler.timeout);
      }
      console.log(`✅ Hoàn thành crawl ${crawler.name}`);
    } catch (error) {
      console.error(`❌ Lỗi nghiêm trọng với ${crawler.name}:`, error.message);
      console.log(
        `⏩ Bỏ qua ${crawler.name} và tiếp tục với crawler tiếp theo...`
      );
      // Không throw, tiếp tục với crawler tiếp theo
    }
  }

  console.log("🎉 Hoàn thành tất cả crawlers!");
}

/**
 * Hàm chạy crawler 1 lần duy nhất, lưu trạng thái vào database
 */
async function runAllCrawlersOnceDB() {
  const crawlerName = "all_crawlers";

  // Transaction chỉ để lock + set 'running'
  let t;
  try {
    t = await sequelize.transaction();

    const record = await sequelize.query(
      `SELECT * FROM crawler_status WHERE crawler_name = :crawlerName FOR UPDATE`,
      { replacements: { crawlerName }, type: QueryTypes.SELECT, transaction: t }
    );

    if (record.length > 0 && record[0].status === "done") {
      console.log("⚠️ Crawler đã chạy trước đó, bỏ qua...");
      await t.commit();
      return;
    }

    if (record.length === 0) {
      await sequelize.query(
        `INSERT INTO crawler_status (id, crawler_name, status) VALUES (:id, :crawlerName, 'running')`,
        { replacements: { id: uuidv4(), crawlerName }, transaction: t }
      );
    } else {
      await sequelize.query(
        `UPDATE crawler_status SET status='running', updatedAt=NOW() WHERE crawler_name=:crawlerName`,
        { replacements: { crawlerName }, transaction: t }
      );
    }

    await t.commit();
  } catch (err) {
    if (t) await t.rollback();
    console.error("❌ Lỗi khi lock/update record:", err);
    return;
  }

  // Chạy crawler ngoài transaction với timeout tổng
  try {
    await withTimeout(async () => {
      await runAllCrawlers();

      await sequelize.query(
        `UPDATE crawler_status SET status='done', last_run_at=NOW(), updatedAt=NOW() WHERE crawler_name=:crawlerName`,
        { replacements: { crawlerName } }
      );

      console.log("✅ Crawler hoàn tất và lưu trạng thái vào DB!");
    }, 30 * 60 * 1000); // 30 minutes timeout cho toàn bộ process
  } catch (err) {
    console.error("❌ Lỗi khi chạy crawler:", err);

    // Cập nhật trạng thái failed
    try {
      await sequelize.query(
        `UPDATE crawler_status SET status='failed', last_error=:error, updatedAt=NOW() WHERE crawler_name=:crawlerName`,
        { replacements: { crawlerName, error: err.message.substring(0, 1000) } }
      );
      console.log("📝 Đã lưu trạng thái failed vào database");
    } catch (dbError) {
      console.error("❌ Không thể lưu trạng thái failed:", dbError);
    }
  }
}

// Chạy crawler 1 lần khi app start
(async () => {
  console.log("🔧 Khởi động crawler service...");
  await runAllCrawlersOnceDB();
  console.log("🔧 Crawler service đã hoàn thành khởi động");
})();

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
