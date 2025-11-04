const { Product, ProductImage } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { productDetailUrl, productImagesElement } = require("@/config/crawler");
const cloudinary = require("@/config/cloudinary");

async function productImagesTable() {
  const products = await Product.findAll({ attributes: ["id", "slug"] });

  const { browser, page } = await initBrowser();

  try {
    for (const [index, product] of products.entries()) {
      const url = `${productDetailUrl}/${product.slug}`;
      console.log(`🔎 Crawl images for product: ${product.slug} -> ${url}`);

      try {
        // Thêm delay trước khi load trang (3-5 giây)
        if (index > 0) {
          const delay = 3000 + Math.random() * 2000; // 3-5 giây
          console.log(
            `⏳ Chờ ${Math.round(delay / 1000)} giây trước khi tiếp tục...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 120000, // Tăng timeout lên 2 phút
        });

        // Tăng delay sau khi load trang (3-5 giây)
        const postLoadDelay = 3000 + Math.random() * 2000;
        console.log(
          `⏳ Chờ ${Math.round(
            postLoadDelay / 1000
          )} giây để trang load hoàn toàn...`
        );
        await new Promise((resolve) => setTimeout(resolve, postLoadDelay));

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
          try {
            // ✅ THÊM: Upload lên Cloudinary trước khi lưu
            console.log(`☁️ Uploading main image to Cloudinary...`);
            const cloudinaryResult = await cloudinary.uploader.upload(
              images.mainImage,
              {
                folder: "products",
                resource_type: "auto",
                timeout: 60000, // Thêm timeout cho Cloudinary
              }
            );

            data.push({
              product_id: product.id,
              image_url: cloudinaryResult.secure_url, // ✅ Dùng link Cloudinary
              is_main: true,
            });
            uniqueImages.add(images.mainImage);
            console.log(`✅ Main image uploaded successfully`);
          } catch (uploadError) {
            console.error(
              `❌ Error uploading main image:`,
              uploadError.message
            );
          }
        }

        // Lưu sub images sau (loại bỏ ảnh trùng main) - GIỮ NGUYÊN LOGIC
        for (const [imgIndex, sub] of images.subImages.entries()) {
          if (sub && !uniqueImages.has(sub)) {
            try {
              // Thêm delay giữa các lần upload ảnh (1-2 giây)
              if (imgIndex > 0) {
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 + Math.random() * 1000)
                );
              }

              console.log(
                `☁️ Uploading sub image ${imgIndex + 1}/${
                  images.subImages.length
                } to Cloudinary...`
              );
              const cloudinaryResult = await cloudinary.uploader.upload(sub, {
                folder: "products",
                resource_type: "auto",
                timeout: 60000, // Thêm timeout cho Cloudinary
              });

              data.push({
                product_id: product.id,
                image_url: cloudinaryResult.secure_url, // ✅ Dùng link Cloudinary
                is_main: false,
              });
              uniqueImages.add(sub);
              console.log(`✅ Sub image ${imgIndex + 1} uploaded successfully`);
            } catch (uploadError) {
              console.error(
                `❌ Error uploading sub image ${imgIndex + 1}:`,
                uploadError.message
              );
            }
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

        // Thêm progress report
        console.log(
          `📊 Progress: ${index + 1}/${products.length} products processed`
        );
      } catch (err) {
        console.error(
          `❌ Error crawling product ${product.slug}:`,
          err.message
        );

        // Nếu có lỗi, thêm delay dài hơn trước khi tiếp tục
        console.log(`⏳ Chờ 10 giây trước khi tiếp tục sau lỗi...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  } catch (err) {
    console.error("❌ Error in productImagesTable:", err.message);
  } finally {
    await browser.close();
    console.log("🎯 Crawl product images completed!");
  }
}

module.exports = productImagesTable;
