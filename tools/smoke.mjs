const target = process.env.SMOKE_URL;

if (!target) {
  console.log("Post-deploy smoke skipped: set SMOKE_URL to run the HTTP smoke check.");
  process.exit(0);
}

const response = await fetch(target, { redirect: "follow" });
if (!response.ok) throw new Error(`${target} returned HTTP ${response.status}`);

const html = await response.text();
const required = [
  "https://codeoverdose.es/",
  "<html lang=\"en\">",
  "Taskify",
  "Firestore",
  "id=\"project-6\"",
  "hreflang=\"es\""
];

for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`${target} is missing ${marker}`);
}

const scriptMatches = html.match(/<script\b[^>]*src=["']script\.js["'][^>]*>/gi) || [];
if (scriptMatches.length !== 1 || !/\bdefer\b/i.test(scriptMatches[0])) {
  throw new Error(`${target} must load script.js exactly once with defer`);
}

console.log(`Post-deploy smoke passed: ${target} (${response.url})`);
