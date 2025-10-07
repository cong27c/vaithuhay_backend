const { Product, ProductDetail } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { productDetailUrl, productDetailElement } = require("@/config/crawler");

async function crawlProductDetail() {
  // 1. Lấy slug sản phẩm từ DB
  const products = await Product.findAll({ attributes: ["id", "slug"] });

  const { browser, page } = await initBrowser();

  page.on("console", (msg) => {
    console.log("PAGE LOG:", msg.text());
  });

  let successCount = 0;
  let errorCount = 0;

  for (const [index, product] of products.entries()) {
    const url = `${productDetailUrl}/${product.slug}`;

    console.log(
      `\n=== Processing product ${index + 1}/${products.length}: ${
        product.slug
      } ===`
    );
    console.log(`URL: ${url}`);

    try {
      // Đơn giản: chỉ cần goto với timeout cao
      console.log(`Navigating to URL...`);

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      console.log(`✅ Page loaded successfully`);

      // Chờ thêm để đảm bảo JavaScript chạy xong
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 2. Lấy dữ liệu theo selector
      console.log(`Extracting data...`);

      const data = await page.evaluate((productDetailElement) => {
        const getText = (sel) =>
          document.querySelector(sel)?.textContent?.trim() || null;
        const getAttr = (sel, attr) =>
          document.querySelector(sel)?.getAttribute(attr) || null;
        const getHTML = (sel) =>
          document.querySelector(sel)?.outerHTML?.trim() || null;

        function getImageUrl(imgEl) {
          if (!imgEl) return "";

          let src = "";

          const srcset = imgEl.getAttribute("srcset");
          if (srcset) {
            const candidates = srcset
              .split(",")
              .map((s) => s.trim().split(" ")[0])
              .filter((c) => c && !c.startsWith("data:"));

            if (candidates.length > 0) {
              src = candidates[candidates.length - 1];
            }
          }

          if (!src) {
            src = imgEl.getAttribute("src") || "";
          }

          if (src.startsWith("//")) {
            src = "https:" + src;
          }

          return src;
        }

        function parseListFlexible(ulSelector) {
          const items = [];
          document.querySelectorAll(`${ulSelector} li`).forEach((li) => {
            const strong = li.querySelector("strong");
            if (strong) {
              const feature = strong.innerText.trim();
              const copy = li.cloneNode(true);
              copy.querySelector("strong").remove();
              const description = copy.innerText.trim();
              items.push({ feature, description });
            } else {
              const description = li.innerText.trim();
              if (description) items.push({ description });
            }
          });
          return items;
        }

        // Hàm lấy long_description - tìm thẻ p có nhiều chữ nhất
        function getLongDescription() {
          const paragraphs = document.querySelectorAll(".vendor-content p");
          console.log("Found paragraphs:", paragraphs.length);

          let longestParagraph = null;
          let maxLength = 0;

          for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            const textContent = p.textContent.trim();
            const textLength = textContent.length;

            console.log(
              `Paragraph ${i}: length=${textLength}, preview: "${textContent.substring(
                0,
                30
              )}..."`
            );

            // Chỉ xét các paragraph có độ dài hợp lý (loại bỏ paragraph quá ngắn)
            if (textLength > 50 && textLength > maxLength) {
              maxLength = textLength;
              longestParagraph = textContent;
              console.log(
                `NEW LONGEST: Paragraph ${i} with ${textLength} chars`
              );
            }
          }

          return longestParagraph;
        }

        return {
          title: getText(productDetailElement.title),
          origin: getText(productDetailElement.origin),
          long_description: getLongDescription(),
          highlights: {
            name: getText(productDetailElement.name),
            img: getImageUrl(document.querySelector(productDetailElement.img)),
            highlights_html: parseListFlexible(
              productDetailElement.highlights_html
            ),
          },
          specifications: getHTML(productDetailElement.specifications),
        };
      }, productDetailElement);

      console.log(`✅ Data extracted successfully`);

      // 3. Lưu vào bảng ProductDetail
      await ProductDetail.create({
        product_id: product.id,
        title: data.title,
        origin: data.origin,
        long_description: data.long_description,
        highlights: data.highlights,
        specifications: data.specifications,
      });

      successCount++;
      console.log(`✅ Successfully saved: ${product.slug}`);

      // Thêm delay giữa các request để tránh bị block
      if (index < products.length - 1) {
        const delay = Math.random() * 3000 + 2000; // 2-5 seconds random delay
        console.log(`⏳ Waiting ${Math.round(delay)}ms before next request...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to process ${product.slug}:`, error.message);

      // Nếu lỗi, thử reload page trước khi tiếp tục
      try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
        console.log(`Page reloaded after error`);
      } catch (reloadError) {
        console.log(`Could not reload page: ${reloadError.message}`);
      }

      continue;
    }
  }

  await browser.close();

  console.log(`\n🎯 CRAWLING SUMMARY`);
  console.log(`📊 Total products: ${products.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(
    `📈 Success rate: ${((successCount / products.length) * 100).toFixed(2)}%`
  );

  return {
    total: products.length,
    success: successCount,
    errors: errorCount,
  };
}

module.exports = { crawlProductDetail };
