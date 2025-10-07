const { initBrowser } = require("@/utils/puppeteer");
const { productElement, collectionUrl } = require("@/config/crawler");
const { Collection, Product, CollectionProduct } = require("@/models");
const productService = require("@/services/product.service");

async function crawlProducts() {
  const { browser, page } = await initBrowser();

  try {
    const collections = await Collection.findAll({
      attributes: ["id", "slug"],
    });

    for (const col of collections) {
      console.log(`\n📂 Crawl collection: ${col.slug}`);

      let pageIndex = 1;
      let totalProductsCollected = 0;
      const maxProductsPerCollection = 15;

      while (totalProductsCollected < maxProductsPerCollection) {
        const url = `${collectionUrl}/${col.slug}?page=${pageIndex}`;
        console.log(`🔎 Crawl page: ${pageIndex} -> ${url}`);

        await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });

        const products = await page.evaluate((productElement) => {
          function getImageUrl(imgEl) {
            if (!imgEl) return "";
            let src = imgEl.getAttribute("srcset");
            if (src) {
              src = src.split(",")[0].trim().split(" ")[0];
            } else {
              src = imgEl.getAttribute("src") || "";
            }
            if (src.startsWith("//")) src = "https:" + src;
            return src;
          }

          const items = document.querySelectorAll(productElement.product);

          return Array.from(items).map((el) => {
            let price =
              el
                .querySelector(productElement.original_price)
                ?.innerText.trim() ||
              el
                .querySelector(productElement.discounted_price)
                ?.innerText.trim() ||
              "";

            const name =
              el.querySelector(productElement.name)?.innerText.trim() || "";
            const link = el.querySelector(productElement.link)?.href || "";
            const slug = link.split("/").pop();
            const img = getImageUrl(el.querySelector(productElement.image));
            const description =
              el.querySelector(productElement.description)?.innerText.trim() ||
              "";

            return { name, link, slug, img, price, description };
          });
        }, productElement);

        if (products.length === 0) {
          console.log(
            `✅ Hết sản phẩm ở collection ${col.slug}, dừng tại page ${pageIndex}`
          );
          break;
        }

        // ---- Giới hạn số lượng sản phẩm cần lấy ----
        const remainingProducts =
          maxProductsPerCollection - totalProductsCollected;
        const productsToProcess = products.slice(0, remainingProducts);

        // ---- Lưu product vào DB ----
        const formattedProducts = productsToProcess.map((p) => {
          const rawPrice = p.price ? p.price.replace(/\D/g, "") : "";
          return {
            name: p.name,
            slug: p.slug,
            description: p.description || "",
            price: rawPrice ? parseFloat(rawPrice) : null,
            stock: Math.floor(Math.random() * 200) + 1,
            status: "active",
            brand_id: null,
          };
        });

        if (formattedProducts.length > 0) {
          await productService.bulkCreate(formattedProducts, {
            ignoreDuplicates: true,
          });

          // ---- Lưu quan hệ product ↔ collection ----
          const dbProducts = await Product.findAll({
            attributes: ["id", "slug"],
            where: { slug: formattedProducts.map((p) => p.slug) },
          });

          const relations = dbProducts.map((p) => ({
            product_id: p.id,
            collection_id: col.id,
          }));

          await CollectionProduct.bulkCreate(relations, {
            ignoreDuplicates: true,
          });

          totalProductsCollected += formattedProducts.length;
          console.log(
            `✅ Đã lưu ${formattedProducts.length} sản phẩm + quan hệ collection ${col.slug} (Tổng: ${totalProductsCollected})`
          );
        }

        // Kiểm tra nếu đã đủ 15 sản phẩm hoặc không còn sản phẩm nào khác
        if (totalProductsCollected >= maxProductsPerCollection) {
          console.log(
            `✅ Đã đủ ${maxProductsPerCollection} sản phẩm cho collection ${col.slug}`
          );
          break;
        }

        // Kiểm tra nếu số sản phẩm trên trang ít hơn số có thể lấy, có thể đã hết sản phẩm
        if (products.length < productsToProcess.length) {
          console.log(
            `✅ Đã lấy hết sản phẩm có sẵn trong collection ${col.slug}`
          );
          break;
        }

        pageIndex++;
      }

      console.log(
        `🎯 Kết thúc collection ${col.slug}: ${totalProductsCollected} sản phẩm`
      );
    }
  } catch (err) {
    console.error("❌ Lỗi khi crawl:", err.message);
  } finally {
    await browser.close();
  }
}

module.exports = { crawlProducts };
