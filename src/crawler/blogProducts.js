const { Product, Blog, BlogProduct } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { productDetailUrl, blogProductsElement } = require("@/config/crawler");

async function crawlBlogProducts() {
  const { browser, page } = await initBrowser();

  // Lấy tất cả product từ DB
  const products = await Product.findAll();

  // Cấu hình timeout và delay cho production
  const config = {
    navigationTimeout: 120000, // 2 phút
    minDelayBetweenRequests: 8000, // 8-15 giây random delay
    maxDelayBetweenRequests: 15000,
    errorRetryDelay: 10000, // 10 giây delay khi có lỗi
    jsExecutionDelay: 3000, // 3 giây chờ JS chạy xong
  };

  console.log(
    `🚀 Starting blog products crawl for ${products.length} products`
  );
  console.log(`📋 Production config: ${JSON.stringify(config, null, 2)}`);

  let successCount = 0;
  let errorCount = 0;

  for (const [index, product] of products.entries()) {
    const slug = product.slug;
    const link = `${productDetailUrl}/${slug}`;

    console.log(`\n=== Processing product ${index + 1}/${products.length} ===`);
    console.log(`📝 Đang crawl: ${link}`);
    console.log(`⏰ Start time: ${new Date().toISOString()}`);

    try {
      // Điều hướng với timeout cao
      console.log(
        `🌐 Navigating to URL with ${config.navigationTimeout}ms timeout...`
      );
      await page.goto(link, {
        waitUntil: "networkidle2",
        timeout: config.navigationTimeout,
      });

      console.log(`✅ Page loaded successfully`);

      // Chờ thêm để đảm bảo JavaScript chạy xong
      console.log(
        `⏳ Waiting ${config.jsExecutionDelay}ms for JavaScript execution...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, config.jsExecutionDelay)
      );

      // Lấy blogList
      const blogsData = await page.evaluate((blogProductsElement) => {
        const blogList = document.querySelector(blogProductsElement.blogList);
        if (!blogList) return [];

        // Lấy danh sách blogItem
        const items = blogList.querySelectorAll(blogProductsElement.blogItem);

        const results = [];
        items.forEach((item) => {
          // Lấy title text
          const titleEl = item.querySelector(blogProductsElement.title);
          const title = titleEl ? titleEl.textContent.trim() : "";

          if (title.includes("HÌNH ẢNH") || title.includes("VIDEO")) {
            return; // bỏ qua item này
          }
          // Lấy content html
          const contentEl = item.querySelector(blogProductsElement.contentHtml);
          const content_html = contentEl ? contentEl.innerHTML.trim() : "";
          const content_text = contentEl ? contentEl.textContent.trim() : "";

          results.push({ title, content_html, content_text });
        });

        return results;
      }, blogProductsElement);

      console.log(`✅ Extracted ${blogsData.length} blog items`);

      // Lưu vào DB
      let savedCount = 0;
      for (const b of blogsData) {
        // tạo Blog
        const blog = await Blog.create({
          title: b.title,
          content_html: b.content_html,
          content_text: b.content_text,
          type: "product",
          created_at: new Date(),
          updated_at: new Date(),
        });

        // tạo BlogProduct liên kết
        await BlogProduct.create({
          product_id: product.id,
          blog_id: blog.id,
        });
        savedCount++;
      }

      successCount++;
      console.log(`✅ Successfully saved ${savedCount} blogs for: ${slug}`);

      // Thêm delay dài hơn giữa các request để tránh bị block
      if (index < products.length - 1) {
        const delay =
          Math.random() *
            (config.maxDelayBetweenRequests - config.minDelayBetweenRequests) +
          config.minDelayBetweenRequests;

        console.log(`⏳ Waiting ${Math.round(delay)}ms before next request...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err) {
      errorCount++;
      console.error(`❌ Lỗi crawl ${link}`, err.message);
      console.error(`🕒 Error time: ${new Date().toISOString()}`);

      // Thêm delay khi có lỗi để tránh request liên tục
      console.log(`💤 Waiting ${config.errorRetryDelay}ms after error...`);
      await new Promise((resolve) =>
        setTimeout(resolve, config.errorRetryDelay)
      );

      continue;
    }
  }

  await browser.close();

  console.log(`\n🎯 BLOG PRODUCTS CRAWLING SUMMARY`);
  console.log(`📊 Total products processed: ${products.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(
    `📈 Success rate: ${((successCount / products.length) * 100).toFixed(2)}%`
  );
  console.log(`⏰ End time: ${new Date().toISOString()}`);
}

module.exports = crawlBlogProducts;
