/* Teste le catalogue en ligne contre le vrai dépôt GitHub (lecture, téléchargement, hors ligne). */
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const cp = require("child_process");
const { createCatalog } = require("../src/catalog");

// fetch minimal via curl (le proxy de l'environnement de test est configuré pour curl)
function curlFetch(url) {
  return new Promise((resolve, reject) => {
    cp.execFile("curl", ["-sS", "-L", "-m", "30", "-w", "\n%{http_code}", url], { encoding: "buffer", maxBuffer: 50e6 }, (err, out) => {
      if (err) return reject(err);
      const i = out.lastIndexOf(10);
      const status = Number(out.slice(i + 1).toString());
      const body = out.slice(0, i);
      resolve({ ok: status >= 200 && status < 300, status, text: async () => body.toString("utf8"), arrayBuffer: async () => body });
    });
  });
}
const offline = () => Promise.reject(new Error("hors ligne"));

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "hub-cat-"));
  const bundledDir = path.join(__dirname, "..", "addons");

  // 1. En ligne : catalogue lu sur GitHub, adresses absolues
  let c = createCatalog({ fetch: curlFetch, userData, bundledDir });
  let r = await c.load(true);
  assert.strictEqual(r.source, "online");
  const tk = r.data.addons.find((a) => a.id === "toolkit");
  assert.ok(tk.download.url.startsWith("https://raw.githubusercontent.com/SURPRIZSTUDIO/"), tk.download.url);
  assert.ok(tk.images.fr[0].startsWith("https://"));

  // 2. Même version que celle fournie avec l'app : pas de téléchargement
  let p = await c.payloadFor({ ...tk, version: tk.bundled.version });
  assert.strictEqual(p.downloaded, false);

  // 3. Version plus récente en ligne : téléchargement, vérification, décompression
  const fakeBundled = fs.mkdtempSync(path.join(os.tmpdir(), "hub-bundled-"));
  const cat = JSON.parse(fs.readFileSync(path.join(bundledDir, "catalog.json"), "utf8"));
  cat.addons[0].version = "0.25.0";
  fs.writeFileSync(path.join(fakeBundled, "catalog.json"), JSON.stringify(cat));
  c = createCatalog({ fetch: curlFetch, userData, bundledDir: fakeBundled });
  r = await c.load(true);
  p = await c.payloadFor(r.data.addons[0]);
  assert.strictEqual(p.downloaded, true);
  assert.ok(fs.existsSync(path.join(p.dir, "CSXS", "manifest.xml")), "manifeste décompressé");
  assert.ok(fs.readFileSync(path.join(p.dir, "CSXS", "manifest.xml"), "utf8").includes("com.surpriz.toolkit"));
  const guide = await c.guideFor(r.data.addons[0], "fr");
  assert.ok(fs.statSync(guide).size > 100000, "guide téléchargé");

  // 4. Empreinte fausse : refus
  const bad = JSON.parse(JSON.stringify(r.data.addons[0]));
  bad.version = "9.9.9"; bad.download.sha256 = "00";
  await assert.rejects(() => c.payloadFor(bad), /corrompu/);

  // 5. Adresse hors du dépôt Sürpriz : refus
  bad.download.url = "https://exemple.com/x.zip"; bad.version = "9.9.8";
  await assert.rejects(() => c.payloadFor(bad), /non autorisée/);

  // 6. Hors ligne : dernière liste connue, puis catalogue de l'app
  const onlineVersion = r.data.addons[0].version;
  c = createCatalog({ fetch: offline, userData, bundledDir });
  r = await c.load(true);
  assert.strictEqual(r.source, "cache"); assert.strictEqual(r.data.addons[0].version, onlineVersion);
  fs.rmSync(path.join(userData, "catalog-cache.json"));
  r = await c.load(true);
  assert.strictEqual(r.source, "bundled");

  fs.rmSync(userData, { recursive: true, force: true }); fs.rmSync(fakeBundled, { recursive: true, force: true });
  console.log("OK : 6 scénarios du catalogue en ligne réussis");
})().catch((e) => { console.error("ÉCHEC", e); process.exit(1); });
