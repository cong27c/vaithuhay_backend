require("module-alias/register");
require("dotenv").config();

const express = require("express");
const webRouter = require("@/routes/web/index");
const apiRouter = require("@/routes/api/index");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const productImagesTable = require("@/crawler/productImagesTable");
const crawlCollections = require("@/crawler/collectionsTable");
const { crawlProducts } = require("@/crawler/productsTable");
const { crawlProductDetail } = require("@/crawler/productDetailsTable");
const { crawlProductVariants } = require("@/crawler/productVariantsTable");
const crawlBlogProducts = require("@/crawler/blogProducts");
const crawlBlogSystems = require("@/crawler/blogSystem");
const guestSessionMiddleware = require("@/middlewares/guestSessionMiddleware");
const optionalAuth = require("@/middlewares/optionalAuth");
// const startPreorderCron = require('./cron/preorderCron');

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

// (async () => {
//   try {
//     const data = await crawlBlogSystems();
//     console.log("Crawl thành công:", data);
//   } catch (err) {
//     console.error("Lỗi khi crawl:", err);
//   }
// })();

app.use(optionalAuth);

app.use(guestSessionMiddleware);

app.use("/", webRouter);
app.use("/api/v1", apiRouter);
//startPreorderCron();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// thứ tự crawl : crawlCollections , crawlProducts , crawlProductDetail , productImagesTable, crawlProductVariants, crawlBlogProducts, crawlBlogSystems
// scroll top trong blogs khi chuyển trang
// tạo hàm render ra sesson_id, id sử dung uuidv4
