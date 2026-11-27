/* Catalogue des addons : lu en ligne (GitHub), avec une copie locale pour travailler hors connexion.
   Les fichiers des addons sont téléchargés à la demande, vérifiés, puis décompressés. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CATALOG_URL = "https://raw.githubusercontent.com/SURPRIZSTUDIO/surpriz-hub/main/catalog.json";
const TIMEOUT_MS = 8000;

/** Hôtes que le hub a le droit de contacter ou d'ouvrir dans le navigateur. */
const ALLOWED_PREFIXES = [
  "https://raw.githubusercontent.com/SURPRIZSTUDIO/",
  "https://github.com/SURPRIZSTUDIO/",
  "https://www.instagram.com/surprizstudio"
];
const allowed = (url) => ALLOWED_PREFIXES.some((p) => String(url).startsWith(p));

function createCatalog({ fetch, userData, bundledDir }) {
  const cacheFile = path.join(userData, "catalog-cache.json");
  let last = null;           // { data, source, fetchedAt }
  let inflight = null;

  const abs = (u, base) => (!u ? u : /^https?:\/\//.test(u) ? u : new URL(u, base).href);

  /** Rend toutes les adresses absolues et repère les fichiers déjà fournis avec l'app. */
  function normalize(data, base) {
    const bundled = readBundled();
    for (const a of data.addons || []) {
      if (a.download && a.download.url) a.download.url = abs(a.download.url, base);
      if (a.icon) a.icon = abs(a.icon, base);
      if (a.guides) for (const k of Object.keys(a.guides)) a.guides[k] = abs(a.guides[k], base);
      if (a.images) for (const k of Object.keys(a.images)) a.images[k] = (a.images[k] || []).map((u) => abs(u, base));
      const b = bundled && (bundled.addons || []).find((x) => x.id === a.id);
      a.bundled = null;
      if (b) {
        a.bundled = {
          version: b.version,
          payload: b.cep && b.cep.payload ? path.join(bundledDir, b.cep.payload) : null,
          icon: b.icon ? path.join(bundledDir, b.icon) : null,
          shots: {},
          guides: {}
        };
        for (const lang of ["fr", "en"]) {
          a.bundled.shots[lang] = (b.shots || []).map((s) => path.join(bundledDir, a.id, "shots", lang, s + ".png"));
          if (b.guides && b.guides[lang]) a.bundled.guides[lang] = path.join(bundledDir, b.guides[lang]);
        }
      }
    }
    if (data.hub && data.hub.download) data.hub.download = abs(data.hub.download, base);
    return data;
  }

  function readBundled() {
    try { return JSON.parse(fs.readFileSync(path.join(bundledDir, "catalog.json"), "utf8")); } catch (e) { return null; }
  }

  async function fetchOnline() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(CATALOG_URL + "?t=" + Date.now(), { signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = JSON.parse(await res.text());
      if (!data || !Array.isArray(data.addons)) throw new Error("catalogue invalide");
      fs.mkdirSync(userData, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(data));
      return data;
    } finally { clearTimeout(t); }
  }

  /** Charge le catalogue : en ligne, sinon la dernière copie, sinon celui fourni avec l'app. */
  async function load(force) {
    if (!force && last && Date.now() - last.fetchedAt < 5 * 60 * 1000) return last;
    if (inflight) return inflight;
    inflight = (async () => {
      let data, source;
      try { data = await fetchOnline(); source = "online"; }
      catch (e) {
        try { data = JSON.parse(fs.readFileSync(cacheFile, "utf8")); source = "cache"; }
        catch (e2) { data = readBundled(); source = "bundled"; }
      }
      last = { data: normalize(JSON.parse(JSON.stringify(data)), CATALOG_URL), source, fetchedAt: Date.now() };
      return last;
    })();
    try { return await inflight; } finally { inflight = null; }
  }

  function find(id) {
    const a = last && last.data.addons.find((x) => x.id === id);
    if (!a) throw new Error("Addon inconnu : " + id);
    return a;
  }

  async function download(url, dest, sha256) {
    if (!allowed(url)) throw new Error("adresse non autorisée : " + url);
    const res = await fetch(url);
    if (!res.ok) throw new Error("téléchargement impossible (HTTP " + res.status + ")");
    const buf = Buffer.from(await res.arrayBuffer());
    if (sha256) {
      const got = crypto.createHash("sha256").update(buf).digest("hex");
      if (got.toLowerCase() !== String(sha256).toLowerCase()) throw new Error("fichier corrompu (empreinte différente)");
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return dest;
  }

  /** Dossier prêt à installer pour cet addon : celui fourni avec l'app s'il est à jour, sinon téléchargé. */
  async function payloadFor(addon) {
    if (addon.bundled && addon.bundled.payload && addon.bundled.version === addon.version && fs.existsSync(addon.bundled.payload)) {
      return { dir: addon.bundled.payload, downloaded: false };
    }
    if (!addon.download || !addon.download.url) throw new Error("aucun fichier à télécharger pour " + addon.id);
    const base = path.join(userData, "addons", addon.id, addon.version);
    const dir = path.join(base, addon.cep.folder);
    if (fs.existsSync(path.join(dir, "CSXS", "manifest.xml"))) return { dir, downloaded: false };
    const zip = await download(addon.download.url, path.join(userData, "downloads", `${addon.id}-${addon.version}.zip`), addon.download.sha256);
    const AdmZip = require("adm-zip");
    fs.rmSync(base, { recursive: true, force: true });
    new AdmZip(zip).extractAllTo(base, true);
    fs.rmSync(zip, { force: true });
    if (!fs.existsSync(path.join(dir, "CSXS", "manifest.xml"))) throw new Error("archive incomplète");
    return { dir, downloaded: true };
  }

  /** Guide PDF : celui de l'app s'il existe, sinon téléchargé une fois puis ouvert localement. */
  async function guideFor(addon, lang) {
    const local = addon.bundled && addon.bundled.version === addon.version && addon.bundled.guides[lang];
    if (local && fs.existsSync(local)) return local;
    const url = addon.guides && (addon.guides[lang] || addon.guides.fr);
    if (!url) return local && fs.existsSync(local) ? local : null;
    const dest = path.join(userData, "guides", `${addon.id}-${addon.version}-${lang}.pdf`);
    if (!fs.existsSync(dest)) await download(url, dest);
    return dest;
  }

  return { load, find, payloadFor, guideFor, allowed, CATALOG_URL };
}

module.exports = { createCatalog, allowed };
