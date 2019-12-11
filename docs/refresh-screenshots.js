const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setViewport({
    width: 1200,
    height: 600
  });

  await page.goto("http://localhost:8081/pages/history");
  await page.click("#date-order")
  await page.screenshot({
    path: path.join(__dirname, "assets/screenshot-history.png")
  });

  await page.goto("http://localhost:8081/pages/mocks");
  await page.screenshot({
    path: path.join(__dirname, "assets/screenshot-mocks.png")
  });

  await browser.close();
})();
