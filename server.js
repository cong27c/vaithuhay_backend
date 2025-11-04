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

/**
 * Hàm chạy tất cả crawlers theo thứ tự
 */
async function runAllCrawlers() {
  console.log("🚀 Bắt đầu crawl tất cả dữ liệu theo thứ tự...");
  try {
    console.log("📁 1. Crawl collections...");
    await crawlCollections();
    console.log("✅ Hoàn thành crawl collections");

    console.log("📦 2. Crawl products...");
    await crawlProducts();
    console.log("✅ Hoàn thành crawl products");

    console.log("🎁 3. Crawl combos...");
    await crawlCombos();
    console.log("✅ Hoàn thành crawl combos");

    console.log("🔍 4. Crawl product details...");
    await crawlProductDetail();
    console.log("✅ Hoàn thành crawl product details");

    console.log("💰 5. Crawl product discounts...");
    await productDiscountsTable();
    console.log("✅ Hoàn thành product discounts");

    console.log("🖼️ 6. Crawl product images...");
    await productImagesTable();
    console.log("✅ Hoàn thành crawl product images");

    console.log("🎨 7. Crawl product variants...");
    await crawlProductVariants();
    console.log("✅ Hoàn thành crawl product variants");

    console.log("📝 8. Crawl blog products...");
    await crawlBlogProducts();
    console.log("✅ Hoàn thành crawl blog products");

    console.log("⚙️ 9. Crawl blog systems...");
    await crawlBlogSystems();
    console.log("✅ Hoàn thành crawl blog systems");

    console.log("🎉 Hoàn thành tất cả crawlers!");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình crawl:", error);
    // Không throw, để server không crash
  }
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

  // Chạy crawler ngoài transaction
  try {
    await runAllCrawlers();

    await sequelize.query(
      `UPDATE crawler_status SET status='done', last_run_at=NOW(), updatedAt=NOW() WHERE crawler_name=:crawlerName`,
      { replacements: { crawlerName } }
    );

    console.log("✅ Crawler hoàn tất và lưu trạng thái vào DB!");
  } catch (err) {
    console.error("❌ Lỗi khi chạy crawler:", err);
    // Không throw → server vẫn chạy bình thường
  }
}

// Chạy crawler 1 lần khi app start
(async () => {
  await runAllCrawlersOnceDB();
})();

// Middlewares
app.use("/", optionalAuth);
app.use("/", guestSessionMiddleware);
app.use("/api/v1", adminAuthMiddleware);

// Routes
app.use("/", webRouter);
app.use("/api/v1", apiRouter);

// Start server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
