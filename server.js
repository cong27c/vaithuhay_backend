require("module-alias/register");

const express = require("express");
const webRouter = require("@/routes/web/index");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const productImagesTable = require("@/crawler/productImagesTable");
const crawlCollections = require("@/crawler/collectionsTable");
const { crawlProducts } = require("@/crawler/productsTable");
const { crawlProductDetail } = require("@/crawler/productDetailsTable");
const { crawlProductVariants } = require("@/crawler/productVariantsTable");
const crawlBlogProducts = require("@/crawler/blogProducts");

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
//     const data = await crawlProductVariants();
//     console.log("Crawl thành công:", data);
//   } catch (err) {
//     console.error("Lỗi khi crawl:", err);
//   }
// })();

app.use("/", webRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// crawl blogs, blog_products , collection_products,

// field name của bảng attributes chưa ổn lắm
// thứ tự crawl : crawlCollections , crawlProducts , crawlProductDetail , productImagesTable, crawlProductVariants, crawlBlogProducts
