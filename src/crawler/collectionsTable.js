const { Collection } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { homeUrl, collectionsElement } = require("@/config/crawler");

async function crawlCollections() {
  const { browser, page } = await initBrowser();

  try {
    await page.goto(homeUrl, { waitUntil: "networkidle2", timeout: 120000 });

    const collections = await page.evaluate((collectionsElement) => {
      function getImageUrl(imgEl) {
        if (!imgEl) return "";
        let src = imgEl.getAttribute("srcset");
        if (src) {
          src = src.split(",")[0].trim().split(" ")[0];
        } else {
          src = imgEl.getAttribute("src") || "";
        }
        if (src && src.startsWith("//")) {
          src = "https:" + src;
        }
        return src;
      }

      const nodes = document.querySelectorAll(collectionsElement.item);
      const results = [];

      nodes.forEach((el) => {
        // ====== 1. Link chính ======
        const mainLink = el.querySelector(collectionsElement.link);
        if (mainLink) {
          const href = mainLink.getAttribute("href");
          if (href) {
            const match = href.match(/\/collections\/([^/?#]+)/);
            if (match) {
              const slug = match[1];
              const name = mainLink.textContent.trim();
              const imgEl = el.querySelector(collectionsElement.image);
              const thumbnail = getImageUrl(imgEl);

              results.push({ name, slug, thumbnail });
            }
          }
        }

        // ====== 2. Link submenu ======
        const subLinks = el.querySelectorAll(collectionsElement.subLink);
        subLinks.forEach((sub) => {
          const href = sub.getAttribute("href");
          if (href) {
            const match = href.match(/\/collections\/([^/?#]+)/);
            if (match) {
              const slug = match[1];
              const name = sub.textContent.trim();
              // submenu thường không có icon => để rỗng
              results.push({ name, slug, thumbnail: "" });
            }
          }
        });
      });

      return results;
    }, collectionsElement);

    if (collections.length > 0) {
      await Collection.bulkCreate(collections, { ignoreDuplicates: true });
      console.log(`✅ Saved ${collections.length} collections`);
    } else {
      console.log("⚠️ No collections found");
    }
  } catch (err) {
    console.error("❌ Error in crawlCollections:", err.message);
  } finally {
    await browser.close();
  }
}

module.exports = crawlCollections;
