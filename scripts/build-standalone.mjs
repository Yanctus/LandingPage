/* Bundles the whole landing page into ONE self-contained HTML file that
   can be opened directly in any browser (double-click, no server needed). */
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFile(join(root, p), "utf8");

const [html, css, mainJs, gsap, scrollTrigger, three] = await Promise.all([
  read("index.html"),
  read("css/style.css"),
  read("js/main.js"),
  read("vendor/gsap.min.js"),
  read("vendor/ScrollTrigger.min.js"),
  read("vendor/three.module.min.js"),
]);

/* three.js is an ES module; embed it base64-encoded and import it at
   runtime through a Blob URL — works without any server. */
const threeB64 = Buffer.from(three, "utf8").toString("base64");
const mainBody = mainJs.replace(/^import \* as THREE from "three";\s*/, "");

let out = html;

/* inline the stylesheet (function replacement: '$' in sources must stay literal) */
out = out.replace(
  /<link rel="stylesheet" href="css\/style.css" \/>/,
  () => `<style>\n${css}\n</style>`
);

/* replace all script tags with inlined versions */
out = out.replace(
  /  <script src="vendor\/gsap.min.js"><\/script>\n  <script src="vendor\/ScrollTrigger.min.js"><\/script>\n  <script type="importmap">[\s\S]*?<\/script>\n  <script type="module" src="js\/main.js"><\/script>/,
  () =>
    `  <script>\n${gsap}\n</script>\n  <script>\n${scrollTrigger}\n</script>\n` +
    `  <script id="three-src" type="text/plain">${threeB64}</script>\n` +
    `  <script type="module">\n` +
    `const __threeSrc = atob(document.getElementById("three-src").textContent);\n` +
    `const __threeUrl = URL.createObjectURL(new Blob([__threeSrc], { type: "text/javascript" }));\n` +
    `const THREE = await import(__threeUrl);\n` +
    `${mainBody}\n</script>`
);

await mkdir(join(root, "dist"), { recursive: true });
await writeFile(join(root, "dist/VereinsKern-Demo.html"), out);
console.log("dist/VereinsKern-Demo.html written,", (out.length / 1024 / 1024).toFixed(2), "MB");

/* second flavour: the warm "premium isometric SaaS miniature world" look */
const premium = out.replace('<html lang="de">', '<html lang="de" data-theme="premium">');
await writeFile(join(root, "dist/VereinsKern-Demo-Premium.html"), premium);
console.log("dist/VereinsKern-Demo-Premium.html written,", (premium.length / 1024 / 1024).toFixed(2), "MB");
