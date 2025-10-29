const { Collection } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { collectionUrl, collectionsElement } = require("@/config/crawler");

async function crawlCollections() {
  const { browser, page } = await initBrowser();

  try {
    await page.goto(collectionUrl, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

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

      // Lấy collectionList (scope)
      const collectionList = document.querySelector(
        `.${collectionsElement.collectionList}`
      );
      if (!collectionList) return [];

      // Lấy tất cả collectionItem trong collectionList
      const collectionItems = collectionList.querySelectorAll(
        collectionsElement.collectionItem
      );

      const collectionsData = [];

      collectionItems.forEach((item) => {
        // Tìm thẻ a có href chứa /collections/
        const linkElement = item.querySelector('a[href*="/collections/"]');

        if (linkElement) {
          // Lấy slug từ href
          const href = linkElement.getAttribute("href");
          const slugMatch = href.match(/\/collections\/([^\/]+)/);
          const slug = slugMatch ? slugMatch[1] : "";

          // Lấy thumbnail từ thẻ img
          const imgElement = linkElement.querySelector("img");
          const thumbnail = getImageUrl(imgElement);

          // Lấy name từ thẻ span
          const spanElement = linkElement.querySelector("span");
          const name = spanElement ? spanElement.textContent.trim() : "";

          if (slug && name) {
            collectionsData.push({
              slug,
              name,
              thumbnail,
            });
          }
        }
      });

      return collectionsData;
    }, collectionsElement);

    console.log(`Found ${collections.length} collections`);

    // Lưu collections vào database
    for (const collectionData of collections) {
      try {
        // Kiểm tra xem collection đã tồn tại chưa
        const existingCollection = await Collection.findOne({
          where: { slug: collectionData.slug },
        });

        if (existingCollection) {
          // Cập nhật collection nếu đã tồn tại
          await existingCollection.update(collectionData);
          console.log(`Updated collection: ${collectionData.name}`);
        } else {
          // Tạo mới collection
          await Collection.create(collectionData);
          console.log(`Created collection: ${collectionData.name}`);
        }
      } catch (error) {
        console.error(`Error saving collection ${collectionData.name}:`, error);
      }
    }

    return collections;
  } catch (error) {
    console.error("Error crawling collections:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = { crawlCollections };
