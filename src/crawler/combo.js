const { initBrowser } = require("@/utils/puppeteer");
const { comboElement, homeUrl } = require("@/config/crawler");
const {
  Combo,
  Product,
  ComboProduct,
  ComboImage,
  ComboImageHotspot,
} = require("@/models");

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

async function crawlProductDetail(page, slug) {
  const maxRetries = 1;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const productUrl = `${homeUrl}/products/${slug}`;
      console.log(`   🔍 [Lần ${attempt}] Đang truy cập: ${productUrl}`);

      await page.goto(productUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Thêm timeout chờ trang load hoàn toàn
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const pageTitle = await page.title();
      console.log(`   📄 Tiêu đề trang: ${pageTitle}`);

      if (pageTitle.includes("404") || pageTitle.includes("Not Found")) {
        console.log(`   ❌ Trang không tồn tại (404)`);
        return {
          name: "",
          original_price: "",
          discounted_price: "",
          description: "",
        };
      }

      console.log(`   🔎 Đang tìm kiếm selectors...`);
      console.log(`      - Price selector: ${comboElement.price}`);
      console.log(
        `      - Original price selector: ${comboElement.original_price}`
      );
      console.log(
        `      - Discounted price selector: ${comboElement.discounted_price}`
      );
      console.log(`      - Name selector: ${comboElement.name}`);
      console.log(`      - Short desc selector: ${comboElement.shortDesc}`);
      console.log(`      - Detail desc selector: ${comboElement.detailDesc}`);

      const productData = await page.evaluate((comboElement) => {
        console.log("🎯 Bắt đầu evaluate product detail...");

        const getPrice = () => {
          console.log("💰 Đang tìm kiếm giá...");

          // Thử các selector khác nhau cho giá
          const priceSelectors = [
            comboElement.price,
            comboElement.original_price,
            comboElement.discounted_price,
          ];

          let priceElement = null;
          let usedSelector = "";

          for (const selector of priceSelectors) {
            if (selector) {
              const element = document.querySelector(selector);
              if (element) {
                priceElement = element;
                usedSelector = selector;
                break;
              }
            }
          }

          console.log(`💰 Selector sử dụng: ${usedSelector}`);
          console.log(`💰 Element tìm thấy:`, priceElement);

          if (priceElement) {
            const priceText = priceElement.innerText.trim();
            console.log(`💰 Text giá: "${priceText}"`);
            return priceText;
          }

          console.log("💰 Không tìm thấy element giá");
          return "";
        };

        const getName = () => {
          console.log("📛 Đang tìm kiếm tên sản phẩm...");
          const nameElement = document.querySelector(comboElement.name);
          console.log(`📛 Element tên:`, nameElement);

          if (nameElement) {
            const nameText = nameElement.innerText.trim();
            console.log(`📛 Tên sản phẩm: "${nameText}"`);
            return nameText;
          }

          console.log("📛 Không tìm thấy element tên");
          return "";
        };

        const getDescription = () => {
          console.log("📝 Đang tìm kiếm mô tả...");
          const shortDescEl = document.querySelector(comboElement.shortDesc);
          const detailDescEl = document.querySelector(comboElement.detailDesc);

          console.log(`📝 Short desc element:`, shortDescEl);
          console.log(`📝 Detail desc element:`, detailDescEl);

          const shortDesc = shortDescEl ? shortDescEl.innerHTML.trim() : "";
          const detailDesc = detailDescEl ? detailDescEl.innerHTML.trim() : "";

          console.log(`📝 Short desc length: ${shortDesc.length}`);
          console.log(`📝 Detail desc length: ${detailDesc.length}`);

          const combinedDesc = `${shortDesc}${detailDesc}`.trim();
          console.log(`📝 Combined desc length: ${combinedDesc.length}`);

          return combinedDesc;
        };

        const result = {
          name: getName(),
          price: getPrice(),
          description: getDescription(),
        };

        console.log("🎯 Kết quả evaluate:", result);
        return result;
      }, comboElement);

      console.log(`   ✅ Crawl thành công lần ${attempt}`);
      console.log(
        `      - Tên: ${
          productData.name ? `"${productData.name}"` : "KHÔNG CÓ"
        }`
      );
      console.log(
        `      - Giá: ${
          productData.price ? `"${productData.price}"` : "KHÔNG CÓ"
        }`
      );
      console.log(
        `      - Mô tả: ${
          productData.description
            ? `${productData.description.length} ký tự`
            : "KHÔNG CÓ"
        }`
      );

      return productData;
    } catch (error) {
      console.log(`   ❌ Lỗi crawl lần ${attempt}: ${error.message}`);

      if (attempt < maxRetries) {
        console.log(`   🔄 Thử lại sau 2s...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.log(`   💥 Đã thử ${maxRetries} lần nhưng không thành công`);
        return {
          name: "",
          price: "",
          description: "",
        };
      }
    }
  }
}

// Hàm retry khi lưu database với số lần thử và delay
async function retryDatabaseOperation(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      console.log(
        `   ⚠️ [Lần ${attempt}/${maxRetries}] Lỗi database: ${error.message}`
      );

      if (attempt < maxRetries) {
        console.log(`   🔄 Thử lại sau ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.log(`   💥 Đã thử ${maxRetries} lần nhưng không thành công`);
        throw error;
      }
    }
  }
}

async function crawlCombos() {
  let browser;
  let page;

  console.log("🚀 Bắt đầu quá trình crawl combos...");

  try {
    console.log("🔧 Đang khởi tạo browser...");
    ({ browser, page } = await initBrowser());
    console.log("✅ Khởi tạo browser thành công");

    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(15000);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (
        resourceType === "image" ||
        resourceType === "font" ||
        resourceType === "media"
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`🌐 Đang truy cập: ${homeUrl}`);
    await page.goto(homeUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    console.log("✅ Truy cập trang chủ thành công");

    console.log(`🔍 Đang tìm kiếm container: ${comboElement.container}`);
    await page.waitForSelector(comboElement.container, {
      timeout: 10000,
    });
    console.log("✅ Tìm thấy container combos");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("🔄 Đang extract dữ liệu combos...");
    const combosData = await page.evaluate((comboElement) => {
      console.log("🎯 Bắt đầu evaluate combos...");

      const getImageUrl = (imgEl) => {
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
      };

      const combos = [];
      const container = document.querySelector(comboElement.container);

      if (!container) {
        console.log("❌ Không tìm thấy container");
        return combos;
      }

      console.log(`✅ Tìm thấy container, đang tìm items...`);
      const containerItems = Array.from(
        container.querySelectorAll(comboElement.containerItem)
      ).slice(0, 16);

      console.log(`📦 Tìm thấy ${containerItems.length} container items`);

      for (const [itemIndex, containerItem] of containerItems.entries()) {
        console.log(`\n🎯 Xử lý container item ${itemIndex + 1}...`);
        const combo = {
          main_image: "",
          images: [],
          hotspots: [],
          name: "",
          author: "",
          description: "",
        };

        try {
          const slideItem = containerItem.querySelector(comboElement.slideItem);
          if (!slideItem) {
            console.log("❌ Không tìm thấy slideItem");
            continue;
          }

          const items = Array.from(
            slideItem.querySelectorAll(comboElement.item)
          );
          console.log(`🖼️ Tìm thấy ${items.length} items trong slide`);

          if (items.length > 0) {
            const firstItem = items[0];
            const mainImg = firstItem.querySelector("img");
            combo.main_image = getImageUrl(mainImg);
            console.log(`📸 Main image: ${combo.main_image ? "CÓ" : "KHÔNG"}`);

            const groupHotSpots = firstItem.querySelector(
              comboElement.groupHotSpots
            );
            if (groupHotSpots) {
              const buttons = groupHotSpots.querySelectorAll("button");
              console.log(`🔘 Tìm thấy ${buttons.length} hotspots`);

              for (const [btnIndex, button] of buttons.entries()) {
                const style = button.getAttribute("style") || "";
                const topMatch = style.match(/--topbtn-galerry:\s*([\d.]+)%/);
                const leftMatch = style.match(/--leftbtn-galerry:\s*([\d.]+)%/);
                const popoverContent =
                  button.getAttribute("data-popover-content") || "";

                let slug = popoverContent;
                if (slug) {
                  slug = slug.replace(/#popover-product-\d+-/, "");
                }

                console.log(`   Hotspot ${btnIndex + 1}:`);
                console.log(`     - Top: ${topMatch ? topMatch[1] : "null"}%`);
                console.log(
                  `     - Left: ${leftMatch ? leftMatch[1] : "null"}%`
                );
                console.log(`     - Popover: ${popoverContent}`);
                console.log(`     - Slug: ${slug}`);

                combo.hotspots.push({
                  top_position: topMatch ? parseFloat(topMatch[1]) : null,
                  left_position: leftMatch ? parseFloat(leftMatch[1]) : null,
                  popover_content: popoverContent,
                  slug: slug,
                });
              }
            } else {
              console.log("❌ Không tìm thấy groupHotSpots");
            }
          }

          for (let i = 1; i < items.length; i++) {
            const img = items[i].querySelector("img");
            const imageUrl = getImageUrl(img);
            if (imageUrl) {
              combo.images.push(imageUrl);
            }
          }
          console.log(`🖼️ Additional images: ${combo.images.length}`);

          const containerIn4 = containerItem.querySelector(
            comboElement.containerIn4
          );
          if (containerIn4) {
            const nameEl = containerIn4.querySelector(comboElement.name);
            combo.name = nameEl ? nameEl.textContent.trim() : "";
            console.log(`📛 Combo name: "${combo.name}"`);

            const authorEl = containerIn4.querySelector(comboElement.author);
            combo.author = authorEl ? authorEl.textContent.trim() : "";
            console.log(`👤 Author: "${combo.author}"`);

            const shortDescEl = document.querySelector(comboElement.shortDesc);
            const detailDescEl = document.querySelector(
              comboElement.detailDesc
            );

            console.log(`📝 Short desc element:`, shortDescEl);
            console.log(`📝 Detail desc element:`, detailDescEl);

            const shortDesc = shortDescEl ? shortDescEl.innerHTML.trim() : "";
            const detailDesc = detailDescEl
              ? detailDescEl.innerHTML.trim()
              : "";

            combo.description = [shortDesc, detailDesc]
              .filter((desc) => desc && desc.trim() !== "")
              .join(" ");

            console.log(`📝 Description length: ${combo.description.length}`);
          } else {
            console.log("❌ Không tìm thấy containerIn4");
          }

          combos.push(combo);
          console.log(`✅ Đã thêm combo ${itemIndex + 1}`);
        } catch (error) {
          console.error("❌ Lỗi xử lý container item:", error);
        }
      }

      console.log(`🎉 Hoàn thành evaluate, tổng: ${combos.length} combos`);
      return combos;
    }, comboElement);

    console.log(`✅ Đã extract được ${combosData.length} combos`);

    console.log("\n🔄 Đang crawl chi tiết sản phẩm...");

    const allSlugs = [];
    combosData.forEach((combo) => {
      if (combo.hotspots) {
        combo.hotspots.forEach((hotspot) => {
          if (hotspot.slug && hotspot.slug.trim() !== "") {
            allSlugs.push({
              slug: hotspot.slug,
              comboIndex: combosData.indexOf(combo),
              hotspotIndex: combo.hotspots.indexOf(hotspot),
            });
          }
        });
      }
    });

    console.log(`📦 Tổng số sản phẩm cần crawl: ${allSlugs.length}`);

    // Debug: hiển thị tất cả slugs
    console.log("\n📋 Danh sách slugs cần crawl:");
    allSlugs.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.slug}`);
    });

    const batchSize = 3;
    for (let i = 0; i < allSlugs.length; i += batchSize) {
      const batch = allSlugs.slice(i, i + batchSize);
      console.log(
        `\n🔍 Đang crawl batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          allSlugs.length / batchSize
        )}...`
      );

      for (const item of batch) {
        console.log(`\n📦 Đang crawl sản phẩm: ${item.slug}`);

        // Thêm timeout giữa các lần crawl sản phẩm
        const randomDelay = Math.floor(Math.random() * 2000) + 2000; // 2-4 giây ngẫu nhiên
        console.log(`   ⏳ Chờ ${randomDelay}ms trước khi crawl...`);
        await new Promise((resolve) => setTimeout(resolve, randomDelay));

        const productData = await crawlProductDetail(page, item.slug);

        combosData[item.comboIndex].hotspots[item.hotspotIndex].productData = {
          name: productData.name,
          price: productData.price,
          description: productData.description,
          slug: item.slug,
        };

        const current = i + batch.indexOf(item) + 1;
        const total = allSlugs.length;
        console.log(
          `   [${current}/${total}] ${productData.name ? "✅" : "❌"} ${
            item.slug
          }`
        );

        // Thêm timeout giữa các sản phẩm trong cùng batch
        if (batch.indexOf(item) < batch.length - 1) {
          const betweenProductDelay = Math.floor(Math.random() * 1000) + 1000; // 1-2 giây
          console.log(
            `   ⏳ Chờ ${betweenProductDelay}ms trước khi chuyển sản phẩm tiếp theo...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, betweenProductDelay)
          );
        }
      }

      // Thêm timeout giữa các batch
      if (i + batchSize < allSlugs.length) {
        const betweenBatchDelay = Math.floor(Math.random() * 3000) + 3000; // 3-6 giây
        console.log(
          `\n⏳ Chờ ${betweenBatchDelay}ms trước khi chuyển batch tiếp theo...`
        );
        await new Promise((resolve) => setTimeout(resolve, betweenBatchDelay));
      }
    }

    console.log("\n📊 KẾT QUẢ CRAWL COMBO VÀ SẢN PHẨM:");
    console.log("========================================");

    let totalValidProducts = 0;
    combosData.forEach((combo, index) => {
      const validProducts = combo.hotspots.filter(
        (h) =>
          h.productData &&
          h.productData.name &&
          h.productData.name.trim() !== ""
      ).length;
      totalValidProducts += validProducts;

      console.log(`\n🎯 COMBO ${index + 1}: ${combo.name || "Không có tên"}`);
      console.log(`   🖼️  Main Image: ${combo.main_image ? "✅" : "❌"}`);
      console.log(`   📷 Additional Images: ${combo.images.length}`);
      console.log(`   🔘 Total Hotspots: ${combo.hotspots.length}`);
      console.log(
        `   ✅ Sản phẩm có dữ liệu: ${validProducts}/${combo.hotspots.length}`
      );
      console.log(
        `   📝 Description: ${
          combo.description
            ? combo.description.substring(0, 50) + "..."
            : "Không có"
        }`
      );

      // Debug chi tiết từng hotspot
      combo.hotspots.forEach((hotspot, hIndex) => {
        console.log(`      Hotspot ${hIndex + 1}:`);
        console.log(`        - Slug: ${hotspot.slug}`);
        console.log(`        - Có productData: ${!!hotspot.productData}`);
        if (hotspot.productData) {
          console.log(
            `        - Tên: ${
              hotspot.productData.name
                ? `"${hotspot.productData.name}"`
                : "KHÔNG CÓ"
            }`
          );
          console.log(
            `        - Giá: ${
              hotspot.productData.price
                ? `"${hotspot.productData.price}"`
                : "KHÔNG CÓ"
            }`
          );
        }
      });
    });

    console.log("\n========================================");
    console.log(`🎉 TỔNG KẾT CRAWL:`);
    console.log(`   📁 Tổng số combos: ${combosData.length}`);
    console.log(`   🔗 Tổng số sản phẩm: ${allSlugs.length}`);
    console.log(`   ✅ Sản phẩm có dữ liệu: ${totalValidProducts}`);
    console.log(
      `   📈 Tỷ lệ thành công: ${
        allSlugs.length > 0
          ? ((totalValidProducts / allSlugs.length) * 100).toFixed(2)
          : 0
      }%`
    );
    console.log("========================================\n");

    await saveToDatabase(combosData);

    return combosData;
  } catch (error) {
    console.error("❌ Lỗi khi crawl:", error.message);
    throw error;
  } finally {
    if (browser) {
      console.log("🔚 Đang đóng browser...");
      await browser.close();
      console.log("✅ Đã đóng browser");
    }
  }
}

async function saveToDatabase(combosData) {
  console.log("\n💾 Đang lưu dữ liệu vào database...");

  let totalCombos = 0;
  let totalProducts = 0;
  let successCombos = 0;
  let successProducts = 0;
  let failedProducts = 0;

  for (const [index, comboData] of combosData.entries()) {
    totalCombos++;
    console.log(`\n📦 [${index + 1}/${combosData.length}] Đang xử lý combo...`);

    try {
      const name = `COMBO SẢN PHẨM ${index + 1}`;
      const author = (comboData.author || "Unknown").substring(0, 100);
      const description = comboData.description || "";

      // Lưu combo với retry
      const combo = await retryDatabaseOperation(async () => {
        return await Combo.create({
          name: name,
          author: author,
          created_by: author,
          description: description,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      });
      console.log(`   ✅ Đã lưu combo: ${combo.name}`);

      let mainImageId = null;

      // Lưu main image với retry
      if (comboData.main_image) {
        try {
          const mainImage = await retryDatabaseOperation(async () => {
            return await ComboImage.create({
              combo_id: combo.id,
              image_url: comboData.main_image.substring(0, 500),
              image_type: "gallery",
              main_image: true,
              display_order: 1,
              alt_text: name.substring(0, 255),
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            });
          });
          mainImageId = mainImage.id;
          console.log(`   ✅ Đã lưu main image`);
        } catch (imageError) {
          console.log(`   ❌ Không thể lưu main image sau 3 lần thử`);
        }
      }

      // Lưu additional images với retry
      if (comboData.images && comboData.images.length > 0) {
        let displayOrder = 2;
        let savedImages = 0;

        for (const imageUrl of comboData.images) {
          try {
            await retryDatabaseOperation(async () => {
              return await ComboImage.create({
                combo_id: combo.id,
                image_url: imageUrl.substring(0, 500),
                image_type: "gallery",
                main_image: false,
                display_order: displayOrder++,
                alt_text: name.substring(0, 255),
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
              });
            });
            savedImages++;
          } catch (imageError) {
            console.log(`   ❌ Không thể lưu additional image sau 3 lần thử`);
          }
        }
        console.log(
          `   ✅ Đã lưu ${savedImages}/${comboData.images.length} additional images`
        );
      }

      // Lưu products và hotspots với retry chi tiết
      if (comboData.hotspots && comboData.hotspots.length > 0) {
        let savedProducts = 0;
        let savedHotspots = 0;

        for (const [hotspotIndex, hotspot] of comboData.hotspots.entries()) {
          totalProducts++;
          if (
            hotspot.slug &&
            hotspot.slug.trim() !== "" &&
            hotspot.productData
          ) {
            try {
              let price = 0;
              if (hotspot.productData.price) {
                const priceMatch =
                  hotspot.productData.price.match(/(\d+[.,]?\d*)/);
                price = priceMatch
                  ? parseFloat(priceMatch[1].replace(",", "."))
                  : 0;
              }

              console.log(`   🔸 Đang lưu sản phẩm: ${hotspot.slug}`);
              function getRandomPrice() {
                const min = 500000; // Giá tối thiểu
                const max = 2500000; // Giá tối đa
                return Math.floor(Math.random() * (max - min + 1)) + min;
              }
              // Lưu Product với retry
              const product = await retryDatabaseOperation(
                async () => {
                  return await Product.create({
                    name: (
                      hotspot.productData.name || `Product ${hotspot.slug}`
                    ).substring(0, 255),
                    price: getRandomPrice(),
                    description: hotspot.productData.description || "",
                    slug: hotspot.slug.substring(0, 255),
                    is_active: true,
                    stock: Math.floor(Math.random() * 200) + 1,
                    status: "available",
                    created_at: new Date(),
                    updated_at: new Date(),
                  });
                },
                3,
                1500
              ); // 3 lần thử, delay 1.5s

              savedProducts++;
              successProducts++;
              console.log(`   ✅ Đã lưu sản phẩm: ${product.name}`);

              // Lưu ComboProduct với retry
              try {
                await retryDatabaseOperation(async () => {
                  return await ComboProduct.create({
                    combo_id: combo.id,
                    product_id: product.id,
                    quantity: 1,
                    display_order: hotspotIndex + 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                  });
                });
                console.log(`   ✅ Đã liên kết sản phẩm với combo`);
              } catch (comboProductError) {
                console.log(`   ❌ Không thể lưu ComboProduct sau 3 lần thử`);
              }

              // Lưu ComboImageHotspot với retry
              if (mainImageId) {
                try {
                  const topPosition = hotspot.top_position
                    ? `${hotspot.top_position}%`
                    : "50%";
                  const leftPosition = hotspot.left_position
                    ? `${hotspot.left_position}%`
                    : "50%";

                  await retryDatabaseOperation(async () => {
                    return await ComboImageHotspot.create({
                      combo_image_id: mainImageId,
                      product_id: product.id,
                      top_position: topPosition,
                      left_position: leftPosition,
                      link_url: `/products/${hotspot.slug}`.substring(0, 500),
                      tooltip_text: (
                        hotspot.productData.name || hotspot.slug
                      ).substring(0, 255),
                      display_order: hotspotIndex + 1,
                      is_active: true,
                      created_at: new Date(),
                      updated_at: new Date(),
                    });
                  });
                  savedHotspots++;
                  console.log(
                    `   ✅ Đã lưu hotspot (${topPosition}, ${leftPosition})`
                  );
                } catch (hotspotError) {
                  console.log(`   ❌ Không thể lưu hotspot sau 3 lần thử`);
                }
              }
            } catch (productError) {
              failedProducts++;
              console.log(
                `   ❌ Không thể lưu sản phẩm ${hotspot.slug} sau 3 lần thử:`,
                productError.message
              );
            }
          } else {
            console.log(
              `   ⚠️ Hotspot ${hotspotIndex + 1} không có slug hoặc productData`
            );
          }
        }

        console.log(
          `   📊 Kết quả lưu sản phẩm: ${savedProducts} thành công, ${
            comboData.hotspots.length - savedProducts
          } thất bại`
        );
      }

      successCombos++;
      console.log(`   ✅ Hoàn thành combo ${combo.name}`);
    } catch (comboError) {
      console.log(`   ❌ Lỗi lưu combo:`, comboError.message);
    }
  }

  console.log("\n📊 TỔNG KẾT LƯU DATABASE:");
  console.log("========================================");
  console.log(`🎯 Combos: ${successCombos}/${totalCombos} thành công`);
  console.log(`📦 Sản phẩm: ${successProducts}/${totalProducts} thành công`);
  console.log(`❌ Sản phẩm thất bại: ${failedProducts}`);
  console.log(
    `📈 Tỷ lệ thành công sản phẩm: ${
      totalProducts > 0
        ? ((successProducts / totalProducts) * 100).toFixed(2)
        : 0
    }%`
  );
  console.log("========================================\n");
}

module.exports = { crawlCombos };
