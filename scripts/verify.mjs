import puppeteer from "puppeteer";
import http from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";

const root = new URL("..", import.meta.url).pathname;
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
};

const server = http
  .createServer(async (req, res) => {
    const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    try {
      const data = await readFile(join(root, path));
      res.writeHead(200, { "Content-Type": mime[extname(path)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  })
  .listen(8123);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1270, height: 633 });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto("http://localhost:8123/", { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));

const scrollH = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
const stops = [0, 0.13, 0.3, 0.45, 0.6, 0.75, 0.9, 1.0];

for (const s of stops) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(scrollH * s));
  /* let the damped camera catch up */
  await new Promise((r) => setTimeout(r, 2600));
  await page.screenshot({ path: `/tmp/shots/p${String(Math.round(s * 100)).padStart(3, "0")}.png` });
  console.log(`shot at ${s}`);
}

console.log("\n--- console/page errors ---");
console.log(errors.length ? errors.join("\n") : "(none)");

await browser.close();
server.close();
