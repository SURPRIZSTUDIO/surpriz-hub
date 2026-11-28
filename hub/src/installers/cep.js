/* Installation des extensions CEP (After Effects, Illustrator, Photoshop, Premiere…).
   - autorise les extensions non signées pour toutes les versions de CEP (réglage par utilisateur, sans mot de passe) ;
   - retire toutes les anciennes copies (même identifiant, quel que soit le nom du dossier) ;
   - copie la nouvelle version et lève la quarantaine de macOS. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");

const IS_MAC = process.platform === "darwin";
const IS_WIN = process.platform === "win32";
const CSXS_VERSIONS = [9, 10, 11, 12, 13, 14, 15, 16];

function userExtDir() {
  if (IS_MAC) return path.join(os.homedir(), "Library", "Application Support", "Adobe", "CEP", "extensions");
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, "Adobe", "CEP", "extensions");
}

function systemExtDirs() {
  if (IS_MAC) return ["/Library/Application Support/Adobe/CEP/extensions"];
  if (IS_WIN) {
    const dirs = [];
    if (process.env["ProgramFiles(x86)"]) dirs.push(path.join(process.env["ProgramFiles(x86)"], "Common Files", "Adobe", "CEP", "extensions"));
    if (process.env.ProgramFiles) dirs.push(path.join(process.env.ProgramFiles, "Common Files", "Adobe", "CEP", "extensions"));
    return dirs;
  }
  return [];
}

function readManifest(dir) {
  try {
    const xml = fs.readFileSync(path.join(dir, "CSXS", "manifest.xml"), "utf8");
    const id = (xml.match(/ExtensionBundleId="([^"]+)"/) || [])[1];
    const version = (xml.match(/ExtensionBundleVersion="([^"]+)"/) || [])[1];
    return id ? { id, version: version || "?" } : null;
  } catch (e) { return null; }
}

/** Toutes les copies de cet addon présentes sur l'ordinateur (dossier utilisateur et dossiers système). */
function findCopies(addon) {
  const ids = [addon.cep.bundleId].concat(addon.cep.legacyIds || []);
  const found = [];
  const scan = (base, system) => {
    let entries = [];
    try { entries = fs.readdirSync(base, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      if (!e.isDirectory() && !e.isSymbolicLink()) continue;
      const dir = path.join(base, e.name);
      const m = readManifest(dir);
      if (m && ids.includes(m.id)) found.push({ dir, id: m.id, version: m.version, system, current: m.id === addon.cep.bundleId });
    }
  };
  scan(userExtDir(), false);
  systemExtDirs().forEach((d) => scan(d, true));
  return found;
}

function debugEnabled() {
  try {
    if (IS_MAC) {
      return CSXS_VERSIONS.every((v) => cp.execFileSync("defaults", ["read", `com.adobe.CSXS.${v}`, "PlayerDebugMode"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "1");
    }
    if (IS_WIN) {
      return CSXS_VERSIONS.every((v) => /PlayerDebugMode\s+REG_SZ\s+1/.test(
        cp.execFileSync("reg", ["query", `HKCU\\Software\\Adobe\\CSXS.${v}`, "/v", "PlayerDebugMode"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true })));
    }
  } catch (e) { return false; }
  return false;
}

function enableDebug() {
  for (const v of CSXS_VERSIONS) {
    if (IS_MAC) cp.execFileSync("defaults", ["write", `com.adobe.CSXS.${v}`, "PlayerDebugMode", "1"]);
    else if (IS_WIN) cp.execFileSync("reg", ["add", `HKCU\\Software\\Adobe\\CSXS.${v}`, "/v", "PlayerDebugMode", "/t", "REG_SZ", "/d", "1", "/f"], { windowsHide: true });
  }
}

/** Retire un dossier système (droits administrateur) : sur Mac, macOS demande le mot de passe. */
function removeSystemCopy(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); return true; } catch (e) { /* droits insuffisants */ }
  if (IS_MAC) {
    const quoted = dir.replace(/'/g, "'\\''");
    const script = `do shell script "rm -rf '${quoted.replace(/"/g, '\\"')}'" with administrator privileges`;
    try { cp.execFileSync("osascript", ["-e", script], { stdio: "ignore" }); return !fs.existsSync(dir); } catch (e) { return false; }
  }
  return false;
}

/** Logiciels Adobe reconnus : nom du dossier d'installation, processus sur Mac (motif) et Windows (exécutable). */
const HOSTS = {
  aftereffects: { folder: /^Adobe After Effects/i, mac: "After Effects[^/]*\\.app/Contents/MacOS", win: "AfterFX.exe" },
  illustrator: { folder: /^Adobe Illustrator/i, mac: "Adobe Illustrator[^/]*\\.app/Contents/MacOS", win: "Illustrator.exe" },
  photoshop: { folder: /^Adobe Photoshop/i, mac: "Adobe Photoshop[^/]*\\.app/Contents/MacOS", win: "Photoshop.exe" },
  premiere: { folder: /^Adobe Premiere Pro/i, mac: "Adobe Premiere Pro[^/]*\\.app/Contents/MacOS", win: "Adobe Premiere Pro.exe" },
  indesign: { folder: /^Adobe InDesign/i, mac: "Adobe InDesign[^/]*\\.app/Contents/MacOS", win: "InDesign.exe" }
};

/** Logiciel hôte d'un addon : versions installées et s'il est ouvert. */
function hostInfo(host) {
  const out = { installed: [], running: false };
  const H = HOSTS[host];
  if (!H) return out;
  try {
    if (IS_MAC) {
      out.installed = fs.readdirSync("/Applications").filter((n) => H.folder.test(n)).map((n) => n.replace(/^Adobe /, ""));
      try { cp.execFileSync("pgrep", ["-f", H.mac], { stdio: "ignore" }); out.running = true; } catch (e) { out.running = false; }
    } else if (IS_WIN) {
      const base = path.join(process.env.ProgramFiles || "C:\\Program Files", "Adobe");
      out.installed = fs.readdirSync(base).filter((n) => H.folder.test(n)).map((n) => n.replace(/^Adobe /, ""));
      const list = cp.execFileSync("tasklist", ["/FI", "IMAGENAME eq " + H.win, "/NH"], { encoding: "utf8", windowsHide: true });
      out.running = list.toLowerCase().includes(H.win.toLowerCase());
    }
  } catch (e) { /* rien trouvé */ }
  out.installed.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return out;
}

function status(addon) {
  const copies = findCopies(addon);
  const main = copies.find((c) => c.current && !c.system) || copies.find((c) => c.current) || null;
  return {
    installed: !!main,
    version: main ? main.version : null,
    location: main ? main.dir : null,
    legacy: copies.filter((c) => c !== main).map((c) => ({ dir: c.dir, version: c.version, system: c.system })),
    debug: debugEnabled(),
    host: hostInfo(addon.host)
  };
}

/** Installe (ou met à jour, ou répare) l'addon. Renvoie la liste des étapes. */
function install(addon, payloadDir) {
  const steps = [];
  const step = (key, fn) => {
    try { const detail = fn(); steps.push({ key, ok: true, detail: detail || null }); return true; }
    catch (e) { steps.push({ key, ok: false, detail: String(e && e.message || e) }); return false; }
  };

  if (!fs.existsSync(path.join(payloadDir, "CSXS", "manifest.xml"))) {
    return { ok: false, steps: [{ key: "payload", ok: false, detail: payloadDir }] };
  }

  step("allow", () => { enableDebug(); });

  step("clean", () => {
    const removed = [], blocked = [];
    for (const c of findCopies(addon)) {
      if (c.system) { (removeSystemCopy(c.dir) ? removed : blocked).push(c.dir); }
      else { fs.rmSync(c.dir, { recursive: true, force: true }); removed.push(c.dir); }
    }
    if (blocked.length) throw new Error("blocked:" + blocked.join("|"));
    return removed.length ? String(removed.length) : null;
  });

  const dest = path.join(userExtDir(), addon.cep.folder);
  const copied = step("copy", () => {
    fs.mkdirSync(userExtDir(), { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(payloadDir, dest, { recursive: true });
    const m = readManifest(dest);
    if (!m || m.id !== addon.cep.bundleId) throw new Error("manifest");
    return dest;
  });

  if (IS_MAC && copied) {
    try { cp.execFileSync("xattr", ["-dr", "com.apple.quarantine", dest], { stdio: "ignore" }); } catch (e) { /* pas de quarantaine */ }
  }

  const host = hostInfo(addon.host);
  return { ok: steps.every((s) => s.ok || s.key === "clean"), steps, hostRunning: host.running, location: dest };
}

function uninstall(addon) {
  const removed = [], blocked = [];
  for (const c of findCopies(addon)) {
    if (c.system) { (removeSystemCopy(c.dir) ? removed : blocked).push(c.dir); }
    else { fs.rmSync(c.dir, { recursive: true, force: true }); removed.push(c.dir); }
  }
  return { ok: blocked.length === 0, removed, blocked, hostRunning: hostInfo(addon.host).running };
}

module.exports = { status, install, uninstall, userExtDir, HOSTS, _test: { findCopies, readManifest, hostInfo } };
