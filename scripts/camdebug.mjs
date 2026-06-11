import puppeteer from "puppeteer";
import http from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";

const root = new URL("..", import.meta.url).pathname;
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http
  .createServer(async (req, res) => {
    const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    try {
      const data = await readFile(join(root, path));
      res.writeHead(200, { "Content-Type": mime[extname(path)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(8127);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1270, height: 633 });
await page.goto("http://localhost:8127/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2000));

const scrollH = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
await page.evaluate((y) => window.scrollTo(0, y), Math.round(scrollH * 0.71));
await new Promise((r) => setTimeout(r, 3000));

const info = await page.evaluate(() => {
  const { camera, curve } = window.__viz;
  const head = curve.getPointAt(0.681);
  return {
    cam: camera.position.toArray().map((v) => v.toFixed(1)),
    head: head.toArray().map((v) => v.toFixed(1)),
    dist: camera.position.distanceTo(head).toFixed(1),
    scrollY: window.scrollY,
    scrollH: document.body.scrollHeight - window.innerHeight,
  };
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
server.close();
