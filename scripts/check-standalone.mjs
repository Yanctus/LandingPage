/* opens the standalone file directly via file:// and checks it renders */
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1270, height: 633 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

const path = new URL("../dist/" + (process.argv[2] || "VereinsKern-Demo.html"), import.meta.url).pathname;
await page.goto("file://" + path, { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3000));
const hasCanvas = await page.evaluate(() => !!document.querySelector("#webgl canvas") && !!window.__viz);
await page.screenshot({ path: "/tmp/shots/standalone_" + (process.argv[2] || "clean") + ".png" });
console.log("canvas+scene ok:", hasCanvas);
console.log("errors:", errors.length ? errors.join("\n") : "(none)");
await browser.close();
