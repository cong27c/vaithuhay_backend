const { Blog } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { blogSystemElement, blogsUrl } = require("@/config/crawler");

async function crawlBlogSystems() {
  const { browser, page } = await initBrowser();

  // Xác định số trang cho mỗi loại blog
  const blogTypes = [
    { name: "setup-decor", totalPages: 3 },
    { name: "cong-nghe", totalPages: 15 },
  ];

  try {
    for (const typeInfo of blogTypes) {
      const type = typeInfo.name;
      const totalPages = typeInfo.totalPages;

      console.log(`\n🎯 Bắt đầu crawl loại: ${type} (${totalPages} trang)`);

      for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        const typeUrl = `${blogsUrl}/${type}?page=${currentPage}`;
        console.log(
          `\n=== Đang crawl trang ${currentPage}/${totalPages}: ${typeUrl} ===`
        );

        try {
          await page.goto(typeUrl, {
            waitUntil: "networkidle2",
            timeout: 60000,
          });
        } catch (error) {
          console.log(`❌ Lỗi khi load trang ${typeUrl}:`, error.message);
          continue;
        }

        // Kiểm tra có blog list không
        try {
          await page.waitForSelector(blogSystemElement.blogList, {
            timeout: 10000,
          });
        } catch {
          console.log(`❌ Không tìm thấy blog list trên trang ${currentPage}`);
          continue;
        }

        // Lấy danh sách blog items
        const blogItems = await page.$$eval(
          blogSystemElement.blogList,
          (blogLists, elementSelectors) => {
            const getImageUrl = (imgEl) => {
              if (!imgEl) return "";
              let src = imgEl.getAttribute("srcset");
              if (src) {
                src = src.split(",")[0].trim().split(" ")[0];
              } else {
                src = imgEl.getAttribute("src") || "";
              }
              if (src.startsWith("//")) src = "https:" + src;
              return src;
            };

            const allBlogItems = [];
            blogLists.forEach((blogList) => {
              blogList
                .querySelectorAll(elementSelectors.blogItem)
                .forEach((item) => {
                  const slugElement = item.querySelector(elementSelectors.slug);
                  const titleElement = item.querySelector(
                    elementSelectors.title
                  );
                  const authorElement = item.querySelector(
                    elementSelectors.author
                  );
                  const thumbnailElement = item.querySelector(
                    elementSelectors.thumbnail
                  );

                  let slug = null;
                  if (slugElement && slugElement.href) {
                    const href = slugElement.href.split("?")[0];
                    const parts = href
                      .split("/")
                      .filter((p) => p.trim() !== "");
                    slug = parts[parts.length - 1];
                  }

                  allBlogItems.push({
                    slug,
                    thumbnail: thumbnailElement
                      ? getImageUrl(thumbnailElement)
                      : null,
                    title: titleElement
                      ? titleElement.textContent.trim()
                      : null,
                    author: authorElement
                      ? authorElement.textContent.trim()
                      : null,
                    fullUrl: slugElement ? slugElement.href : null,
                  });
                });
            });
            return allBlogItems;
          },
          blogSystemElement
        );

        if (blogItems.length === 0) {
          console.log(`❌ Không có blog nào trên trang ${currentPage}`);
          continue;
        }

        const validBlogItems = blogItems.filter(
          (item) => item.slug && item.slug !== "blogs"
        );

        const blogsToSave = [];
        for (const blogItem of validBlogItems) {
          try {
            const blogDetailUrl = blogItem.fullUrl?.startsWith("http")
              ? blogItem.fullUrl
              : `${blogsUrl}/${blogItem.slug}`;

            await page.goto(blogDetailUrl, {
              waitUntil: "networkidle2",
              timeout: 30000,
            });

            const contentData = await page.evaluate((contentSelector) => {
              const getImageUrl = (imgEl) => {
                if (!imgEl) return "";
                let src = imgEl.getAttribute("srcset");
                if (src) {
                  src = src.split(",")[0].trim().split(" ")[0];
                } else {
                  src = imgEl.getAttribute("src") || "";
                }
                if (src.startsWith("//")) src = "https:" + src;
                return src;
              };

              const contentElement = document.querySelector(contentSelector);
              if (!contentElement) return { html: null, text: null };

              const clonedElement = contentElement.cloneNode(true);
              clonedElement.querySelectorAll("img").forEach((img) => {
                const url = getImageUrl(img);
                if (url) {
                  img.setAttribute("src", url);
                  img.removeAttribute("srcset");
                }
              });

              return {
                html: clonedElement.innerHTML,
                text: clonedElement.textContent.trim(),
              };
            }, blogSystemElement.contentHtml);

            if (!contentData.html || !contentData.text) continue;

            blogsToSave.push({
              title: blogItem.title,
              slug: blogItem.slug,
              content_html: contentData.html,
              content_text: contentData.text,
              thumbnail: blogItem.thumbnail,
              type,
              author: blogItem.author,
            });
          } catch (error) {
            console.error(`💥 Lỗi khi crawl chi tiết blog:`, error.message);
          }
        }

        // ✅ Lưu luôn sau mỗi trang
        if (blogsToSave.length > 0) {
          console.log(
            `💾 Đang lưu ${blogsToSave.length} blogs từ trang ${currentPage}...`
          );
          await Blog.bulkCreate(blogsToSave, {
            updateOnDuplicate: [
              "title",
              "content_html",
              "content_text",
              "thumbnail",
              "type",
              "author",
              "updatedAt",
            ],
          });
          console.log(
            `✅ Đã lưu thành công ${blogsToSave.length} blogs vào DB`
          );
        } else {
          console.log(
            `❌ Không có blogs hợp lệ để lưu từ trang ${currentPage}`
          );
        }

        // Delay tránh bị chặn
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("💥 Lỗi khi crawl blog systems:", error);
  } finally {
    await browser.close();
  }

  console.log(`\n🎊 Crawl blog hoàn tất!`);
}

module.exports = crawlBlogSystems;
