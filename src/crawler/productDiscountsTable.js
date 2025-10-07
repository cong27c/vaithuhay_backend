const { Product, ProductDiscount } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const {
  productDiscountsElement,
  productDetailUrl,
} = require("@/config/crawler");

async function productDiscountsTable() {
  const { browser, page } = await initBrowser();

  try {
    const products = await Product.findAll({
      attributes: ["id", "slug"],
      where: {
        // Điều kiện lọc nếu cần
      },
    });

    if (!products || products.length === 0) {
      console.log("Không tìm thấy sản phẩm nào");
      return [];
    }

    const productDiscounts = [];
    const failedProducts = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        const link = `${productDetailUrl}/${product.slug}`;
        console.log(`[${i + 1}/${products.length}] Đang crawler: ${link}`);

        // Thử 3 lần cho mỗi sản phẩm
        let retryCount = 0;
        let success = false;
        let discountValueNum = null;

        while (retryCount < 3 && !success) {
          try {
            await page.goto(link, {
              waitUntil: "networkidle2",
              timeout: 30000,
            });

            await page.waitForSelector(productDiscountsElement.discount_value, {
              timeout: 10000,
            });

            const discountValue = await page.$eval(
              productDiscountsElement.discount_value,
              (el) => el.textContent.replace(/[^\d]/g, "")
            );

            discountValueNum = parseInt(discountValue, 10);
            success = true;
          } catch (retryError) {
            retryCount++;
            console.log(`Thử lại lần ${retryCount} cho ${product.slug}`);

            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        if (success && !isNaN(discountValueNum)) {
          const now = new Date();
          const startDate = new Date("2025-09-20");
          const endDate = new Date("2025-12-12");

          productDiscounts.push({
            product_id: product.id,
            discount_value: discountValueNum,
            discount_type: "system",
            start_date: startDate,
            end_date: endDate,
            status: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          failedProducts.push(product.slug);
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Lỗi với sản phẩm ${product.slug}:`, error.message);
        failedProducts.push(product.slug);
      }
    }

    await browser.close();

    // Báo cáo kết quả
    console.log(`\nKết quả crawler:`);
    console.log(`- Thành công: ${productDiscounts.length}/${products.length}`);
    console.log(`- Thất bại: ${failedProducts.length}`);
    if (failedProducts.length > 0) {
      console.log(`- Sản phẩm thất bại: ${failedProducts.join(", ")}`);
    }

    // Lưu vào database
    if (productDiscounts.length > 0) {
      const createdDiscounts = await ProductDiscount.bulkCreate(
        productDiscounts,
        {
          updateOnDuplicate: ["discount_value", "updatedAt"],
        }
      );

      console.log(`Đã lưu ${createdDiscounts.length} bản ghi giảm giá`);
      return createdDiscounts;
    }

    return [];
  } catch (error) {
    console.error("Lỗi tổng:", error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}
module.exports = productDiscountsTable;
