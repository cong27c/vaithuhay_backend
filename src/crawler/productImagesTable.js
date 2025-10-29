const { Product, ProductImage } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { productDetailUrl, productImagesElement } = require("@/config/crawler");
const cloudinary = require("@/config/cloudinary");

async function productImagesTable() {
  const products = await Product.findAll({ attributes: ["id", "slug"] });

  const { browser, page } = await initBrowser();

  try {
    for (const product of products) {
      const url = `${productDetailUrl}/${product.slug}`;
      console.log(`🔎 Crawl images for product: ${product.slug} -> ${url}`);

      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const images = await page.evaluate((productImagesElement) => {
          function getImageUrl(imgEl) {
            if (!imgEl) return "";
            let src =
              imgEl.getAttribute("srcset") ||
              imgEl.getAttribute("src") ||
              imgEl.getAttribute("data-src") ||
              imgEl.getAttribute("data-original") ||
              imgEl.getAttribute("data-lazy") ||
              "";
            if (src.includes(",")) {
              src = src.split(",")[0].trim().split(" ")[0];
            }
            if (src.startsWith("//")) {
              src = "https:" + src;
            }
            return src;
          }

          const container = document.querySelector(
            productImagesElement.listImage
          );
          let mainImage = null;
          let subImages = [];

          if (container) {
            // ✅ Lấy sub images từ data-list (giữ nguyên logic cũ)
            const dataListEl = container.querySelector(
              productImagesElement.subImage
            );
            if (dataListEl && dataListEl.getAttribute("data-list")) {
              const dataList = dataListEl.getAttribute("data-list") || "";
              subImages = dataList
                .split("https://")
                .filter(Boolean)
                .map((link) => "https://" + link.trim());
            }

            // Nếu không có data-list thì fallback sang <img> (giữ nguyên logic cũ)
            if (!subImages.length) {
              const subImgEls = Array.from(
                container.querySelectorAll(
                  ".slick-slide:not(.slick-cloned) img"
                )
              );
              subImages = subImgEls
                .map((el) => getImageUrl(el))
                .filter((src) => src);
            }

            // ✅ ĐỔI: Lấy mainImage là ảnh đầu tiên của subImages
            if (subImages.length > 0) {
              mainImage = subImages[0];
            }
          }

          return { mainImage, subImages };
        }, productImagesElement);

        console.log("Crawled mainImage:", images.mainImage);
        console.log("Crawled subImages count:", images.subImages.length);

        // ✅ Chuẩn hóa & xử lý: mainImage trước, rồi mới subImages (GIỮ NGUYÊN LOGIC)
        const data = [];
        const uniqueImages = new Set();

        // Lưu main image trước (là ảnh đầu tiên của subImages) - GIỮ NGUYÊN
        if (images.mainImage) {
          // ✅ THÊM: Upload lên Cloudinary trước khi lưu
          const cloudinaryResult = await cloudinary.uploader.upload(
            images.mainImage,
            {
              folder: "products",
              resource_type: "auto",
            }
          );

          data.push({
            product_id: product.id,
            image_url: cloudinaryResult.secure_url, // ✅ Dùng link Cloudinary
            is_main: true,
          });
          uniqueImages.add(images.mainImage);
        }

        // Lưu sub images sau (loại bỏ ảnh trùng main) - GIỮ NGUYÊN LOGIC
        for (const sub of images.subImages) {
          if (sub && !uniqueImages.has(sub)) {
            // ✅ THÊM: Upload lên Cloudinary trước khi lưu
            const cloudinaryResult = await cloudinary.uploader.upload(sub, {
              folder: "products",
              resource_type: "auto",
            });

            data.push({
              product_id: product.id,
              image_url: cloudinaryResult.secure_url, // ✅ Dùng link Cloudinary
              is_main: false,
            });
            uniqueImages.add(sub);
          }
        }

        if (data.length > 0) {
          await ProductImage.bulkCreate(data, { ignoreDuplicates: true });
          console.log(
            `✅ Saved ${data.length} images for product ${product.slug}`
          );
        } else {
          console.log(`⚠️ No images found for product ${product.slug}`);
        }
      } catch (err) {
        console.error(
          `❌ Error crawling product ${product.slug}:`,
          err.message
        );
      }
    }
  } catch (err) {
    console.error("❌ Error in productImagesTable:", err.message);
  } finally {
    await browser.close();
  }
}

module.exports = productImagesTable;
