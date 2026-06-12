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
  .listen(8126);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1270, height: 633 });
await page.goto("http://localhost:8126/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2000));

const scrollH = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
const marks = await page.evaluate(() => window.__viz.marks);
console.log("marks:", JSON.stringify(marks));
for (const s of [marks.P_PITCH + 0.062, 1.0]) {
  await page.evaluate(
    (y, p) => {
      window.scrollTo(0, y);
      window.__viz.snap(p);
    },
    Math.round(scrollH * s),
    s
  );
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `/tmp/shots/door_${String(Math.round(s * 1000)).padStart(3, "0")}.png` });
}
await browser.close();
server.close();
console.log("done");
