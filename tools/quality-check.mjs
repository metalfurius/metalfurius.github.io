import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const htmlPath = join(root, "index.html");
const cssPath = join(root, "styles.css");
const jsPath = join(root, "script.js");
const html = readFileSync(htmlPath, "utf8");
const css = readFileSync(cssPath, "utf8");
const js = readFileSync(jsPath, "utf8");
const failures = [];
const mode = process.argv[2] || "all";

function check(condition, message) {
  if (!condition) failures.push(message);
}

function parseTranslations() {
  const match = js.match(/const translations = (\{[\s\S]*?\n\s*\});\r?\n\r?\nconst rollMessages/);
  check(Boolean(match), "translations object could not be parsed");
  if (!match) return { en: {}, es: {} };
  try {
    return vm.runInNewContext(`(${match[1]})`, Object.create(null));
  } catch (error) {
    failures.push(`translations object is invalid: ${error.message}`);
    return { en: {}, es: {} };
  }
}

function localReference(reference) {
  const clean = decodeURIComponent(reference.split("#")[0].split("?")[0]);
  return resolve(root, normalize(clean));
}

function checkHtml() {
  check(/^<!doctype html>/i.test(html), "HTML5 doctype is missing");
  check(/<html\s+lang="en">/i.test(html), "English no-JS fallback language is missing");
  check(/<main\b[^>]*id="main-content"/.test(html), "main landmark or skip target is missing");
  check(/<link\s+rel="canonical"\s+href="https:\/\/codeoverdose\.es\/"/.test(html), "canonical custom-domain root is missing");
  for (const lang of ["en", "es", "x-default"]) check(new RegExp(`hreflang="${lang}"`).test(html), `hreflang ${lang} is missing`);
  check(/property="og:title"/.test(html) && /name="twitter:title"/.test(html), "social title metadata is incomplete");
  check(/property="og:description"/.test(html) && /name="twitter:description"/.test(html), "social description metadata is incomplete");
  const stylesheetReferences = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="[^"]+"[^>]*>/gi) || [];
  const runtimeReferences = html.match(/<script\b[^>]*src="[^"]+"[^>]*>/gi) || [];
  check(stylesheetReferences.length === 1 && /href="styles\.[0-9a-f]{12}\.css"/i.test(stylesheetReferences[0] || ""), "the stylesheet must use one content-addressed reference");
  check(runtimeReferences.length === 1 && /src="script\.[0-9a-f]{12}\.js"/i.test(runtimeReferences[0] || ""), "the runtime must use one content-addressed script reference");
  check(/<script\b[^>]*src="script\.[0-9a-f]{12}\.js"[^>]*\bdefer\b/i.test(html), "the content-addressed runtime script must be deferred");
  check(!html.includes("href=\"#\""), "placeholder hash links remain");
  check(!/(?:href|src)="\/assets\//.test(html), "root-relative asset references break subpath previews");
  check(!/[ÃÂ�]/.test(html + js + css), "mojibake characters remain in source");
  check(!html.includes("particles.js"), "external particles.js dependency remains");
  check(!existsSync(join(root, ".idea")) && !existsSync(join(root, ".vs")), "IDE artifacts remain in the product tree");

  const translations = parseTranslations();
  const htmlKeys = [...html.matchAll(/data-(?:translate|aria-label)="([^"]+)"/g)].map((match) => match[1]);
  for (const key of new Set(htmlKeys)) {
    check(Object.prototype.hasOwnProperty.call(translations.en, key), `English translation is missing: ${key}`);
    check(Object.prototype.hasOwnProperty.call(translations.es, key), `Spanish translation is missing: ${key}`);
  }
  check(JSON.stringify(Object.keys(translations.en).sort()) === JSON.stringify(Object.keys(translations.es).sort()), "English and Spanish dictionaries are not key-parity");

  const images = [...html.matchAll(/<img\b([^>]+)>/gi)].map((match) => match[1]);
  check(images.length >= 12, "project media coverage is incomplete");
  for (const attributes of images) {
    check(/\balt="[^"]*"/.test(attributes), "an image is missing an alt attribute");
    check(/\bwidth="\d+"/.test(attributes) && /\bheight="\d+"/.test(attributes), "an image is missing intrinsic dimensions");
    check(/\bloading="lazy"/.test(attributes), "an image is missing lazy loading");
    check(/\bdecoding="async"/.test(attributes), "an image is missing async decoding");
  }

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/gi)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|#|data:)/i.test(reference)) continue;
    check(existsSync(localReference(reference)), `local reference does not exist: ${reference}`);
  }

  for (const match of html.matchAll(/<a\b([^>]+)>/gi)) {
    const attributes = match[1];
    if (/target="_blank"/i.test(attributes)) check(/rel="[^"]*noopener/i.test(attributes), "a new-tab link is missing rel=\"noopener\"");
  }
}

function checkCss() {
  check(css.includes("@media (prefers-reduced-motion: reduce)"), "reduced-motion media query is missing");
  check(css.includes("min-width: 320px"), "320px minimum viewport guard is missing");
  check(!css.includes("overflow-x: hidden"), "overflow-x hidden masks layout defects");
  check(!/width:\s*100vw/.test(css), "100vw can create horizontal overflow");
  check(css.includes("grid-template-columns: repeat(auto-fit, minmax(min(100%,"), "project grid is not bounded for narrow viewports");
  check(css.includes("dialog"), "dialog styling is missing");
  check(css.includes(":focus-visible"), "visible keyboard focus treatment is missing");
}

function checkJs() {
  check(!js.includes("localStorage"), "language behavior should not depend on localStorage");
  check(js.includes("showModal"), "native dialog opening is missing");
  check(js.includes("focusRestoration"), "dialog focus restoration is missing");
  check(js.includes("event.key !== \"Tab\""), "dialog keyboard focus handling is missing");
  check(js.includes("addEventListener(\"cancel\""), "dialog Escape/cancel handling is missing");
  check(js.includes("requestAnimationFrame"), "dialog initial focus is missing");
  check(js.includes("js-enabled"), "progressive enhancement marker is missing");
}

function checkA11y() {
  check((html.match(/<dialog\b/g) || []).length === 6, "all six project dialogs should be semantic dialog elements");
  for (const match of html.matchAll(/<dialog\b([^>]+)>/gi)) {
    check(/aria-labelledby="[^"]+"/.test(match[1]), "a dialog is missing an accessible name");
  }
  check((html.match(/class="close-modal"/g) || []).length === 6, "each dialog needs a close button");
  check((html.match(/aria-pressed="(?:true|false)"/g) || []).length === 2, "language state is not exposed to assistive technology");
  check((html.match(/aria-current="page"/g) || []).length === 1, "current navigation state is missing");
  check(html.includes("aria-live=\"polite\""), "dice status is missing a live region");
}

function checkAssets() {
  const assets = join(root, "assets");
  check(existsSync(assets), "assets directory is missing");
  let bytes = 0;
  if (existsSync(assets)) {
    for (const name of readdirSync(assets)) {
      const file = join(assets, name);
      if (statSync(file).isFile()) bytes += statSync(file).size;
    }
  }
  check(bytes <= 5_500_000, `asset budget exceeded: ${bytes} bytes > 5500000`);
  check(existsSync(join(assets, "luckbound_concept.jpg")), "Luckbound image should use its actual JPG extension");
  check(!existsSync(join(assets, "luckbound_concept.png")), "stale Luckbound PNG filename remains");
  check(readFileSync(join(root, "CNAME"), "utf8").trim() === "codeoverdose.es", "CNAME is not the canonical custom domain");
}

function checkIntegrity() {
  const scripts = [...html.matchAll(/<script\b([^>]+)>/gi)].map((match) => match[1]);
  check(scripts.length === 1, "unexpected script tags or duplicate runtime references remain");
  check(scripts.every((attributes) => /src="script\.[0-9a-f]{12}\.js"/.test(attributes) && /\bdefer\b/.test(attributes)), "runtime script integrity attributes are incomplete");
  check(!/<script\b[^>]*src="https?:/i.test(html), "remote executable scripts are not allowed");
  check(!html.includes("?v=") && !html.includes("?ver="), "query-string cache busting remains on the canonical page");
}

function checkPerformance() {
  const budgets = [
    ["index.html", 45_000, html.length],
    ["styles.css", 60_000, css.length],
    ["script.js", 45_000, js.length]
  ];
  for (const [name, budget, size] of budgets) check(size <= budget, `${name} exceeds its ${budget}-byte source budget (${size})`);
}

function checkLinks() {
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/gi)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|#|data:)/i.test(reference)) continue;
    check(existsSync(localReference(reference)), `local link or asset is missing: ${reference}`);
  }
}

function checkArtifact() {
  const artifact = join(root, ".pages");
  check(existsSync(join(artifact, "index.html")), "Pages artifact is missing index.html");
  check(existsSync(join(artifact, "CNAME")), "Pages artifact is missing CNAME");
  check(existsSync(join(artifact, "assets")), "Pages artifact is missing assets");
  check(existsSync(join(artifact, "site-revision.json")), "Pages artifact is missing site-revision.json");
  check(existsSync(join(artifact, "styles.8a6775e69351.css")), "Pages artifact is missing the immutable stylesheet");
  check(existsSync(join(artifact, "script.8d644fa8d579.js")), "Pages artifact is missing the immutable runtime");
}

if (["all", "html", "parity", "links", "a11y", "integrity"].includes(mode)) checkHtml();
if (["all", "css"].includes(mode)) checkCss();
if (["all", "js"].includes(mode)) checkJs();
if (["all", "a11y"].includes(mode)) checkA11y();
if (["all", "assets", "performance"].includes(mode)) checkAssets();
if (["all", "integrity"].includes(mode)) checkIntegrity();
if (["all", "performance"].includes(mode)) checkPerformance();
if (["all", "links"].includes(mode)) checkLinks();
if (mode === "artifact") checkArtifact();

if (failures.length) {
  console.error(`Quality checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Quality checks passed: ${mode}`);
