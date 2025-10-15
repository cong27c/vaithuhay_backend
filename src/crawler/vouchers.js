const { Voucher } = require("@/models/index");
const { initBrowser } = require("@/utils/puppeteer");
const { vouchersElement, checkoutsUrl } = require("@/config/crawler");

async function crawlVouchers() {
  const { browser, page } = await initBrowser();
}
