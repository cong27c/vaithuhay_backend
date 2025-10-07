const puppeteer = require("puppeteer");

async function initBrowser() {
  const browser = await puppeteer.launch({
    headless: false, // false để debug xem browser chạy
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Set user-agent giả giống người dùng thật
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/118.0.0.0 Safari/537.36"
  );

  return { browser, page };
}

module.exports = { initBrowser };
