const puppeteer = require("puppeteer");
const path = require("path");
const axios = require("axios");

const screenshots_dir = path.join(__dirname, ".vuepress/public/screenshots/");
const smockerAdminHost = "http://localhost:8081";
const smockerServerHost = "http://localhost:8080";

const mocks = `
- request:
    method: GET
    path: /hello/world
  response:
    status: 200
    headers:
      Content-Type: application/json
    body: >
      {"message": "Hello, World!"}
- request:
    method: POST
    path: /hello/world
  response:
    status: 500
    headers:
      Content-Type: application/json
    body: >
      {"message": "error"}
`;

const screenshotElement = async ({ page, name, selector, padding = 0 }) => {
  const rect = await page.evaluate(selector => {
    const element = document.querySelector(selector);
    const { x, y, width, height } = element.getBoundingClientRect();
    return { left: x, top: y, width, height, id: element.id };
  }, selector);

  return await page.screenshot({
    path: screenshots_dir + name,
    clip: {
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    }
  });
};

const screenshotPage = async (page, name) => {
  return await page.screenshot({ path: screenshots_dir + name });
};

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setViewport({ width: 1200, height: 600 });

  // Screenshot empty history
  await axios.post(smockerAdminHost + "/reset");
  await page.goto(smockerAdminHost + "/pages/history");
  await screenshotPage(page, "screenshot-empty-history.png");

  // Screenshot mocks
  await axios.post(smockerAdminHost + "/mocks", mocks, {
    headers: { "Content-Type": "application/x-yaml" }
  });
  await page.goto(smockerAdminHost + "/pages/mocks");
  await page.screenshot({ path: screenshots_dir + "screenshot-mocks.png" });

  // Screenshot history
  await axios.get(smockerServerHost + "/hello/world");
  try {
    await axios.post(smockerServerHost + "/hello/world"); //ignore legit error
  } catch {}
  await page.goto(smockerAdminHost + "/pages/history");
  await screenshotPage(page, "screenshot-history.png");

  // Screenshot history cards
  await screenshotElement({
    page,
    name: "screenshot-hello-world-200.png",
    selector: ".entry:nth-child(3)"
  });
  try {
    await axios.delete(smockerServerHost + "/hello/world"); //ignore legit error
  } catch {}
  await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
  await screenshotElement({
    page,
    name: "screenshot-hello-world-666.png",
    selector: ".entry:nth-child(2)"
  });

  await browser.close();
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log("err: " + e);
    process.exit(1);
  });
