import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const target = process.env.SMOKE_URL;

if (!target) {
  console.log("Post-deploy smoke skipped: set SMOKE_URL to run the HTTP smoke check.");
  process.exit(0);
}

const rootUrl = new URL(target);
rootUrl.pathname = "/";
rootUrl.search = "";
rootUrl.hash = "";
const indexUrl = new URL("index.html", rootUrl);
const manifestUrl = new URL("site-revision.json", rootUrl);
const localManifest = JSON.parse(readFileSync(join(process.cwd(), "site-revision.json"), "utf8"));
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function digest(bytes) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

async function fetchPage(url) {
  const response = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: { "cache-control": "no-cache", pragma: "no-cache" }
  });
  check(response.ok, `${url} returned HTTP ${response.status}`);
  return {
    url: response.url,
    response,
    bytes: new Uint8Array(await response.arrayBuffer())
  };
}

const rootPage = await fetchPage(rootUrl);
const indexPage = await fetchPage(indexUrl);
const manifestPage = await fetchPage(manifestUrl);
const rootHtml = Buffer.from(rootPage.bytes).toString("utf8");
const indexHtml = Buffer.from(indexPage.bytes).toString("utf8");

for (const [name, html] of [["/", rootHtml], ["/index.html", indexHtml]]) {
  for (const marker of [
    "https://codeoverdose.es/",
    "Taskify",
    "Firestore",
    "id=\"project-6\"",
    "hreflang=\"es\"",
    "<dialog"
  ]) check(html.includes(marker), `${name} is missing ${marker}`);
  check(!html.includes('src="script.js"'), `${name} still references the mutable legacy runtime`);
  check(!html.includes('href="styles.css"'), `${name} still references the mutable legacy stylesheet`);
}

const revisionOf = (html) => html.match(/<meta\s+name="codeoverdose:revision"\s+content="([^"]+)"/i)?.[1] || "";
const rootRevision = revisionOf(rootHtml);
const indexRevision = revisionOf(indexHtml);
check(rootRevision && rootRevision === indexRevision, "canonical root and /index.html do not expose the same revision");
check(rootRevision === localManifest.revision, `canonical HTML revision ${rootRevision || "missing"} does not match the checked-in revision ${localManifest.revision}`);

let remoteManifest;
try {
  remoteManifest = JSON.parse(Buffer.from(manifestPage.bytes).toString("utf8"));
} catch (error) {
  failures.push(`site-revision.json is not valid JSON: ${error.message}`);
}
check(JSON.stringify(remoteManifest) === JSON.stringify(localManifest), "deployed site-revision.json differs from the checked-in revision");

const stylesheet = rootHtml.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/i)?.[1] || "";
const runtime = rootHtml.match(/<script\b[^>]*src="([^"]+)"[^>]*>/i)?.[1] || "";
check(stylesheet === localManifest.assets.css.path, "canonical HTML stylesheet does not match site-revision.json");
check(runtime === localManifest.assets.js.path, "canonical HTML runtime does not match site-revision.json");

for (const asset of [localManifest.assets.css, localManifest.assets.js]) {
  const assetUrl = new URL(asset.path, rootUrl);
  const page = await fetchPage(assetUrl);
  check(digest(page.bytes) === asset.sha256, `${asset.path} bytes do not match site-revision.json`);
}

for (const page of [rootPage, indexPage]) {
  const cacheControl = page.response.headers.get("cache-control") || "";
  check(/(?:no-cache|no-store|max-age=0|must-revalidate)/i.test(cacheControl), `${new URL(page.url).pathname} must be revalidating, got Cache-Control: ${cacheControl || "missing"}`);
}

const repeatUrls = [rootUrl, indexUrl, manifestUrl, new URL(localManifest.assets.css.path, rootUrl), new URL(localManifest.assets.js.path, rootUrl)];
for (const url of repeatUrls) {
  const first = await fetchPage(url);
  const second = await fetchPage(url);
  check(digest(first.bytes) === digest(second.bytes), `repeated no-query requests are not stable for ${url.pathname}`);
}

if (failures.length) {
  console.error(`Post-deploy smoke failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Post-deploy smoke passed: ${rootUrl} (${localManifest.revision})`);
