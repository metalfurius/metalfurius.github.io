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
const retryCount = Math.max(1, Math.min(Number.parseInt(process.env.SMOKE_RETRIES || "4", 10) || 4, 5));
const retryDelayMs = Math.max(250, Math.min(Number.parseInt(process.env.SMOKE_RETRY_DELAY_MS || "1000", 10) || 1000, 5_000));

function check(condition, message) {
  if (!condition) failures.push(message);
}

function digest(bytes, path = "") {
  const text = Buffer.from(bytes).toString("utf8");
  const normalized = /\.(?:css|js)$/i.test(path) ? text.replaceAll("\r\n", "\n") : bytes;
  return createHash("sha256").update(typeof normalized === "string" ? normalized : Buffer.from(normalized)).digest("hex");
}

async function fetchPage(url) {
  let response;
  let error;
  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    response = undefined;
    try {
      response = await fetch(url, {
        redirect: "follow",
        cache: "no-store",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }
      });
      error = undefined;
    } catch (fetchError) {
      error = fetchError;
    }
    const retryable = error || response?.status === 403 || response?.status === 408 || response?.status === 429 || response?.status >= 500;
    if (!retryable || attempt === retryCount) break;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  const cacheStatus = response?.headers.get("cf-cache-status") || "unknown";
  const server = response?.headers.get("server") || "unknown";
  check(!error && response?.ok, `${url} returned HTTP ${error ? `fetch error: ${error.message}` : response?.status || "no response"} (cf-cache-status: ${cacheStatus}; server: ${server}; attempts: ${retryCount})`);
  return {
    url: response?.url || url.toString(),
    response,
    bytes: response ? new Uint8Array(await response.arrayBuffer()) : new Uint8Array()
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
  check(digest(page.bytes, asset.path) === asset.sha256, `${asset.path} bytes do not match site-revision.json`);
}

for (const page of [rootPage, indexPage]) {
  const cacheControl = page.response?.headers.get("cache-control") || "";
  check(/(?:no-cache|no-store|max-age=0|must-revalidate)/i.test(cacheControl), `${new URL(page.url).pathname} must be revalidating, got Cache-Control: ${cacheControl || "missing"}`);
}

const repeatUrls = [rootUrl, indexUrl, manifestUrl, new URL(localManifest.assets.css.path, rootUrl), new URL(localManifest.assets.js.path, rootUrl)];
for (const url of repeatUrls) {
  const first = await fetchPage(url);
  const second = await fetchPage(url);
  check(digest(first.bytes, url.pathname) === digest(second.bytes, url.pathname), `repeated no-query requests are not stable for ${url.pathname}`);
}

if (failures.length) {
  console.error(`Post-deploy smoke failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Post-deploy smoke passed: ${rootUrl} (${localManifest.revision})`);
