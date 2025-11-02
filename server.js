require("module-alias/register");
require("dotenv").config();

const express = require("express");
const webRouter = require("@/routes/web/index");
const apiRouter = require("@/routes/api/index");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const guestSessionMiddleware = require("@/middlewares/guestSessionMiddleware");
const optionalAuth = require("@/middlewares/optionalAuth");
const { crawlCollections } = require("@/crawler/collectionsTable");
const { crawlCombos } = require("@/crawler/combo");
const { crawlProducts } = require("@/crawler/productsTable");
const { crawlProductDetail } = require("@/crawler/productDetailsTable");
const productDiscountsTable = require("@/crawler/productDiscountsTable");
const productImagesTable = require("@/crawler/productImagesTable");
const { crawlProductVariants } = require("@/crawler/productVariantsTable");
const crawlBlogProducts = require("@/crawler/blogProducts");
const crawlBlogSystems = require("@/crawler/blogSystem");
const adminAuthMiddleware = require("@/middlewares/adminAuthMiddleware");
// const startPreorderCron = require('./cron/preorderCron');
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.use(
  cors({
    origin: "http://localhost:5173", // cho phép FE gọi
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true, // nếu dùng cookie / token
  })
);
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

async function runAllCrawlers() {
  console.log("🚀 Bắt đầu crawl tất cả dữ liệu theo thứ tự...");

  try {
    // 1. Crawl collections
    console.log("📁 1. Đang crawl collections...");
    await crawlCollections();
    console.log("✅ Hoàn thành crawl collections");

    // 2. Crawl products
    console.log("📦 2. Đang crawl products...");
    await crawlProducts();
    console.log("✅ Hoàn thành crawl products");

    //3. Crawl combos
    console.log("🎁3. Đang crawl combos...");
    await crawlCombos();
    console.log("✅ Hoàn thành crawl combos");

    // 4. Crawl product details
    console.log("🔍 4. Đang crawl product details...");
    await crawlProductDetail();
    console.log("✅ Hoàn thành crawl product details");

    // 5. Crawl product discounts (bạn cần import hàm này)
    console.log("💰 5. Đang crawl product discounts...");
    await productDiscountsTable();
    console.log("⏭️  Bỏ qua product discounts - chưa được import");

    // 6. Crawl product images
    console.log("🖼️  6. Đang crawl product images...");
    await productImagesTable();
    console.log("✅ Hoàn thành crawl product images");

    // 7. Crawl product variants
    console.log("🎨 7. Đang crawl product variants...");
    await crawlProductVariants();
    console.log("✅ Hoàn thành crawl product variants");

    // 8. Crawl blog products
    console.log("📝 8. Đang crawl blog products...");
    await crawlBlogProducts();
    console.log("✅ Hoàn thành crawl blog products");

    // 9. Crawl blog systems
    console.log("⚙️  9. Đang crawl blog systems...");
    await crawlBlogSystems();
    console.log("✅ Hoàn thành crawl blog systems");

    console.log("🎉 Đã hoàn thành tất cả crawl theo đúng thứ tự!");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình crawl:", error);
    throw error;
  }
}

const CRAWL_STATUS_FILE = path.join(__dirname, "crawl_status.json");

async function runAllCrawlersOnce() {
  try {
    // Nếu file tồn tại => đã crawl rồi => bỏ qua
    if (fs.existsSync(CRAWL_STATUS_FILE)) {
      console.log("⚠️ Dữ liệu đã được crawl trước đó, bỏ qua...");
      return;
    }

    console.log("🚀 Bắt đầu crawl lần đầu...");
    await runAllCrawlers();

    // Ghi lại trạng thái hoàn tất crawl
    fs.writeFileSync(
      CRAWL_STATUS_FILE,
      JSON.stringify(
        { done: true, timestamp: new Date().toISOString() },
        null,
        2
      )
    );

    console.log("✅ Crawl hoàn tất và đã lưu trạng thái!");
  } catch (err) {
    console.error("❌ Lỗi khi chạy crawler:", err);
  }
}

(async () => {
  await runAllCrawlersOnce();
})();

app.use("/", optionalAuth); // Cho web routes
app.use("/", guestSessionMiddleware);

app.use("/api/v1", adminAuthMiddleware); // Chỉ auth, không guest session

app.use("/", webRouter);
app.use("/api/v1", apiRouter);
//startPreorderCron();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// thứ tự crawl : crawlCollections ,crawlCombos, crawlProducts , crawlProductDetail ,productDiscountsTable, productImagesTable, crawlProductVariants, crawlBlogProducts, crawlBlogSystems
// scroll top trong blogs khi chuyển trang
// tạo hàm render ra sesson_id, id sử dung uuidv4
