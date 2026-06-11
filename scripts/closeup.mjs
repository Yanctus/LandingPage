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
  .listen(8124);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
await page.goto("http://localhost:8124/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1500));

/* park the camera right above the turbine field, looking at it */
await page.evaluate(() => {
  const { camera, scene, renderer } = window.__viz;
  setInterval(() => {
    camera.position.set(-6, 38, 66);
    camera.lookAt(20, 0, 40);
    renderer.render(scene, camera);
  }, 5);
});
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: "/tmp/shots/closeup_turbines.png" });

await browser.close();
server.close();
