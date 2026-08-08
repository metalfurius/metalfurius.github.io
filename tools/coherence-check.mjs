import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const fail = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (name) => readFileSync(join(root, name), "utf8");
const sha256 = (name) => createHash("sha256").update(read(name)).digest("hex");

const html = read("index.html");
const manifestPath = join(root, "site-revision.json");
fail(existsSync(manifestPath), "site-revision.json is missing");

let manifest = null;
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    failures.push(`site-revision.json is invalid: ${error.message}`);
  }
}

const stylesheet = html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";
const scripts = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
const cssMatch = stylesheet.match(/^styles\.([0-9a-f]{12})\.css$/);
const jsMatch = scripts.length === 1 ? scripts[0].match(/^script\.([0-9a-f]{12})\.js$/) : null;

fail(Boolean(cssMatch), `stylesheet must be content-addressed, got ${stylesheet || "none"}`);
fail(scripts.length === 1, `exactly one runtime script is required, found ${scripts.length}`);
fail(Boolean(jsMatch), `runtime script must be content-addressed, got ${scripts[0] || "none"}`);
fail(!html.includes('href="styles.css"') && !html.includes('src="script.js"'), "mutable runtime asset reference remains in index.html");
fail(!stylesheet.includes("?") && !scripts.some((script) => script.includes("?")), "query-string cache busting remains on runtime assets");

if (cssMatch && jsMatch && manifest) {
  const cssPath = cssMatch[0];
  const jsPath = jsMatch[0];
  fail(existsSync(join(root, cssPath)), `${cssPath} is missing`);
  fail(existsSync(join(root, jsPath)), `${jsPath} is missing`);

  if (existsSync(join(root, cssPath)) && existsSync(join(root, jsPath))) {
    const cssHash = sha256(cssPath);
    const jsHash = sha256(jsPath);
    const revision = `${cssHash.slice(0, 12)}-${jsHash.slice(0, 12)}`;
    const expectedManifest = {
      schema: 1,
      revision,
      entrypoint: "index.html",
      assets: {
        css: { path: cssPath, sha256: cssHash },
        js: { path: jsPath, sha256: jsHash }
      }
    };
    fail(cssHash.startsWith(cssMatch[1]), `${cssPath} does not match its filename hash`);
    fail(jsHash.startsWith(jsMatch[1]), `${jsPath} does not match its filename hash`);
    fail(html.includes(`name="codeoverdose:revision" content="${revision}"`), "index.html revision marker does not match runtime assets");
    fail(JSON.stringify(manifest) === JSON.stringify(expectedManifest), "site-revision.json does not match the deployed runtime assets");
  }
}

for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
  const reference = match[1];
  if (/^(?:https?:|mailto:|#|data:)/i.test(reference)) continue;
  fail(!reference.includes("?"), `local reference uses a query string: ${reference}`);
}

if (failures.length) {
  console.error(`Revision coherence checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Revision coherence checks passed");
