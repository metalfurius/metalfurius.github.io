// Public loader. The key is supplied only in the URL fragment and is never
// stored in this file or sent with requests to the server.
const payloadRoot = "./pack/395c4306c8b8aa46/";
const status = document.querySelector("#gate-status");
const progressWrap = document.querySelector("#progress-wrap");
const progress = document.querySelector("#gate-progress");
let opening = false;
let unlockedHash = null;

function setStatus(message) {
  status.textContent = message;
}

function decodeLinkKey() {
  const value = new URLSearchParams(location.hash.slice(1)).get("k");
  if (!value) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error("invalid-link");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=";
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("invalid-link");
  return bytes;
}

async function decryptFile(key, relativePath) {
  const response = await fetch(payloadRoot + relativePath);
  if (!response.ok) throw new Error("download-failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 28) throw new Error("invalid-file");
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.subarray(0, 12) },
    key,
    bytes.subarray(12),
  );
}

function replaceAssetPaths(text, assets) {
  for (const [path, url] of Object.entries(assets)) text = text.replaceAll(path, url);
  if (text.includes("./assets/")) throw new Error("missing-asset");
  return text;
}

async function openDossier(key, manifest) {
  if (!Array.isArray(manifest.assets) || manifest.assets.length < 1) throw new Error("invalid-manifest");
  const assetUrls = {};
  const logicalUrls = {};
  const entries = manifest.assets;
  const total = entries.length + 3;
  let completed = 0;
  let next = 0;
  progressWrap.hidden = false;

  function advance() {
    completed++;
    progress.value = Math.round((completed / total) * 100);
    setStatus(`Identidad verificada. Descifrando pruebas: ${completed} de ${total}.`);
  }

  const [htmlBytes, cssBytes, codeBytes] = await Promise.all(
    ["site.enc", "style.enc", "code.enc"].map(async (name) => {
      const bytes = await decryptFile(key, name);
      advance();
      return bytes;
    }),
  );

  async function loadNextAsset() {
    while (next < entries.length) {
      const entry = entries[next++];
      if (!/^[a-z0-9][a-z0-9.-]*$/i.test(entry.name) || !/^[a-f0-9]{24}\.bin$/.test(entry.file)) {
        throw new Error("invalid-manifest");
      }
      const decrypted = await decryptFile(key, `media/${entry.file}`);
      const url = URL.createObjectURL(new Blob([decrypted], { type: entry.mime }));
      assetUrls[entry.name] = url;
      logicalUrls[`./assets/${entry.name}`] = url;
      advance();
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, loadNextAsset));
  const decoder = new TextDecoder();
  const html = replaceAssetPaths(decoder.decode(htmlBytes), logicalUrls);
  const css = replaceAssetPaths(decoder.decode(cssBytes), logicalUrls);
  const code = replaceAssetPaths(decoder.decode(codeBytes), logicalUrls);
  const privatePage = new DOMParser().parseFromString(html, "text/html");
  privatePage.body.querySelectorAll("script").forEach((script) => script.remove());

  // Restore the original page only after every encrypted resource is available.
  for (const link of privatePage.head.querySelectorAll("link")) {
    if (link.getAttribute("href") === "./styles.css") continue;
    document.head.appendChild(document.importNode(link, true));
  }
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  document.querySelector("#gate-style")?.remove();
  document.title = privatePage.title;
  document.documentElement.lang = privatePage.documentElement.lang || "es";
  document.body.innerHTML = privatePage.body.innerHTML;
  const homeLink = document.querySelector(".agency-mark");
  if (homeLink) homeLink.href = location.href;
  document.querySelector(".skip-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    const target = document.querySelector("#main-content");
    target?.focus();
    target?.scrollIntoView({ block: "start" });
  });
  window.__melyAssets = assetUrls;
  const codeUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  try {
    await import(codeUrl);
  } finally {
    URL.revokeObjectURL(codeUrl);
  }
  window.addEventListener("pagehide", () => {
    Object.values(assetUrls).forEach((url) => URL.revokeObjectURL(url));
  }, { once: true });
}

async function main() {
  if (opening) return;
  opening = true;
  let rawKey;
  try {
    rawKey = decodeLinkKey();
  } catch {
    setStatus("El enlace está incompleto o alterado. Solicita el enlace original a la agencia.");
    opening = false;
    return;
  }
  if (!rawKey) {
    opening = false;
    return;
  }
  if (!globalThis.crypto?.subtle) {
    setStatus("Este navegador necesita una conexión segura para abrir el expediente.");
    opening = false;
    return;
  }
  setStatus("Comprobando credenciales del enlace…");
  let key;
  let manifest;
  try {
    key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
    manifest = JSON.parse(new TextDecoder().decode(await decryptFile(key, "manifest.enc")));
  } catch {
    setStatus("Acceso denegado. Comprueba que has abierto el enlace completo.");
    opening = false;
    return;
  }
  try {
    await openDossier(key, manifest);
    unlockedHash = location.hash;
  } catch {
    progressWrap.hidden = true;
    setStatus("No se ha podido abrir el expediente. Comprueba tu conexión y vuelve a cargar la página.");
  }
  opening = false;
}

window.addEventListener("hashchange", () => {
  if (unlockedHash && location.hash !== unlockedHash) {
    location.reload();
  } else if (!unlockedHash) {
    main();
  }
});

main();
