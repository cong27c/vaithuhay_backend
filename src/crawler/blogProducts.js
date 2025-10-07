const { Product, Blog, BlogProduct } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { productDetailUrl, blogProductsElement } = require("@/config/crawler");

async function crawlBlogProducts() {
  const { browser, page } = await initBrowser();

  // Lấy tất cả product từ DB
  const products = await Product.findAll();

  for (const product of products) {
    const slug = product.slug;
    const link = `${productDetailUrl}/${slug}`;

    console.log(`Đang crawl: ${link}`);
    try {
      await page.goto(link, { waitUntil: "networkidle2", timeout: 60000 });

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

      // Lưu vào DB
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
      }
    } catch (err) {
      console.error(`Lỗi crawl ${link}`, err);
    }
  }

  await browser.close();
}

module.exports = crawlBlogProducts;
