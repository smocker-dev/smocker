/* eslint-disable @typescript-eslint/no-var-requires */
const puppeteer = require("puppeteer");
const path = require("path");
const axios = require("axios");

const screenshotsDir = path.join(__dirname, ".vuepress/public/screenshots/");
const smockerAdminHost = "http://localhost:8081";
const smockerServerHost = "http://localhost:8080";

const historyPagePath = "/pages/history";
const mocksPagePath = "/pages/mocks";
const resetPath = "reset";

const defaultViewPort = { width: 1400, height: 700 };
const zoomedViewPort = { width: 1201, height: 500 };

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
  const rect = await page.evaluate((select) => {
    const element = document.querySelector(select);
    const { x, y, width, height } = element.getBoundingClientRect();
    return { left: x, top: y, width, height, id: element.id };
  }, selector);

  return page.screenshot({
    path: screenshotsDir + name,
    clip: {
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    },
  });
};

const screenshotPage = async (page, name) => {
  return page.screenshot({ path: screenshotsDir + name });
};

async function main() {
  const browser = await puppeteer.launch({ args : ['--single-process', '--disable-gpu'] })
  const page = await browser.newPage();
  await page.setViewport(zoomedViewPort);

  // Screenshot empty + add
  await axios.post(smockerAdminHost + resetPath);
  await page.goto(smockerAdminHost + historyPagePath);
  await page.waitForSelector("li.ant-menu-item:nth-child(1) > div:nth-child(1)", {
    visible: true,
  });
  await page.waitForTimeout(300);
  await screenshotElement({
    page,
    name: "screenshot-sessions.png",
    selector: ".sidebar",
  });
  await screenshotPage(page, "screenshot-empty-history.png");
  await page.goto(smockerAdminHost + mocksPagePath);
  await page.waitForSelector("li.ant-menu-item:nth-child(1)", {
    visible: true,
  });
  await page.waitForTimeout(300);
  await screenshotPage(page, "screenshot-empty-mocks.png");
  await page.click("button.add-mocks-button");
  await page.waitForTimeout(300);
  await page.screenshot({ path: screenshotsDir + "screenshot-add-mocks.png" });
  await page.setViewport(defaultViewPort);

  // Screenshot hello-world 666
  try {
    await axios.get(smockerServerHost + "/hello/world"); //ignore legit error
  } catch {}
  await page.goto(smockerAdminHost + historyPagePath);
  await page.waitForSelector(".history", { visible: true });
  await page.waitForTimeout(300);
  await screenshotPage(page, "screenshot-history-666.png");
  await screenshotElement({
    page,
    name: "screenshot-hello-world-666.png",
    selector: ".entry:nth-child(2)",
    padding: 5,
  });

  // Screenshot mocks
  await axios.post(smockerAdminHost + "/mocks", mocks, {
    headers: { "Content-Type": "application/x-yaml" },
  });
  await page.goto(smockerAdminHost + mocksPagePath);
  await page.waitForSelector(".mocks", { visible: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: screenshotsDir + "screenshot-mocks.png" });

  // Screenshot hello-world 200 + 500
  try {
    await axios.post(smockerServerHost + "/hello/world"); //ignore legit error
  } catch {}
  await axios.get(smockerServerHost + "/hello/world");
  await page.goto(smockerAdminHost + historyPagePath);
  await page.waitForSelector(".history", { visible: true });
  await page.waitForTimeout(300);
  await screenshotPage(page, "screenshot-history.png");
  await page.waitForTimeout(300);
  await screenshotElement({
    page,
    name: "screenshot-hello-world-200.png",
    selector: ".entry:nth-child(2)",
    padding: 5,
  });

  await page.click("button.visualize-button");
  await page.waitForSelector(".mermaid", { visible: true });
  await page.waitForTimeout(300);
  await screenshotPage(page, "screenshot-history-visualize.png");

  await browser.close();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log("err: " + e);
    process.exit(1);
  });
