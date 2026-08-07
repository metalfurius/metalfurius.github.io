import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const output = join(root, ".pages");
const files = [
  "index.html",
  "styles.css",
  "script.js",
  "CNAME",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "README.md",
  "LICENSE.md",
  "CV cover letter FCO JAVIER.pdf",
  "CV Francisco Javier Hernández Murillo English.pdf",
  "CV Francisco Javier Hernández Murillo Spanish.pdf"
];

if (!existsSync(join(root, "index.html"))) throw new Error("index.html is missing");

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of files) {
  const source = join(root, file);
  if (existsSync(source)) cpSync(source, join(output, file), { recursive: true });
}

cpSync(join(root, "assets"), join(output, "assets"), { recursive: true });
console.log(`Pages artifact ready: ${output}`);
