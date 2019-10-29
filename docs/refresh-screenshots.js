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
  await page.waitFor(3000);
  await page.screenshot({
    path: path.join(__dirname, "screenshot-history.png")
  });

  await page.goto("http://localhost:8081/pages/mocks");
  await page.waitFor(3000);
  await page.screenshot({ path: path.join(__dirname, "screenshot-mocks.png") });

  await browser.close();
})();
