import puppeteer from "puppeteer";
import http from "http";
import { readFile, mkdir } from "fs/promises";
import { extname, join } from "path";

const root = new URL("..", import.meta.url).pathname;
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http
  .createServer(async (req, res) => {
    let path = req.url.split("?")[0];
    if (path === "/") path = "/index.html";
    try {
      const data = await readFile(join(root, path));
      res.writeHead(200, { "Content-Type": mime[extname(path)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(8125);

await mkdir("/tmp/rec", { recursive: true });

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.goto("http://localhost:8125/" + (process.argv[2] || ""), { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2000));

const scrollH = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
const FRAMES = 360;

for (let i = 0; i < FRAMES; i++) {
  /* ease the scroll a little at both ends, hold briefly at the finish */
  const u = Math.min(i / (FRAMES - 40), 1);
  const eased = u * u * (3 - 2 * u);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(scrollH * eased));
  await page.screenshot({ path: `/tmp/rec/f_${String(i).padStart(4, "0")}.png` });
  if (i % 60 === 0) console.log(`frame ${i}/${FRAMES}`);
}

await browser.close();
server.close();
console.log("done");
