/* Windows : au premier lancement depuis Téléchargements, le hub s'installe comme une vraie app
   (dossier Programmes de l'utilisateur, menu Démarrer, Bureau, Paramètres › Applications), puis se rouvre depuis là.
   Gère aussi la désinstallation lancée depuis Paramètres › Applications. */
let fs;
try { fs = require("original-fs"); } catch (e) { fs = require("fs"); } // sans lecture des .asar comme des dossiers
const asarFs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const APP_ID = "com.surpriz.hub";
const DISPLAY = "SÜRPRIZ HÜB";
const REG_KEY = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SurprizHub";

const psQuote = (s) => "'" + String(s).replace(/'/g, "''") + "'";
function cmpVer(a, b) {
  const pa = String(a || "0").split(".").map(Number), pb = String(b || "0").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}

function dirSizeKb(dir) {
  let total = 0;
  const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n), st = fs.lstatSync(p); if (st.isDirectory()) walk(p); else total += st.size; } };
  try { walk(dir); } catch (e) { /* taille indicative */ }
  return Math.round(total / 1024);
}

/** Lance un script PowerShell (5.1) et attend sa fin. */
function runPowerShell(script, { spawnFn, exe = "powershell.exe", detached = false } = {}) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-EncodedCommand", encoded];
  const child = (spawnFn || spawn)(exe, args, { detached, stdio: "ignore", windowsHide: true });
  if (detached) { child.unref && child.unref(); return Promise.resolve(0); }
  return new Promise((resolve) => { child.on("exit", (code) => resolve(code)); child.on("error", () => resolve(-1)); });
}

function createWinInstall({ execPath, env, version, desktop, userData, shell, spawnFn, psExe }) {
  const local = env.LOCALAPPDATA || path.join(env.USERPROFILE || "", "AppData", "Local");
  const installDir = path.join(local, "Programs", "SURPRIZ HUB");
  const exeName = path.basename(execPath);
  const srcDir = path.dirname(execPath);
  const installedExe = () => {
    try { return path.join(installDir, fs.readdirSync(installDir).find((n) => n.toLowerCase().endsWith(".exe")) || exeName); }
    catch (e) { return path.join(installDir, exeName); }
  };
  const startMenuLnk = path.join(env.APPDATA || path.join(env.USERPROFILE || "", "AppData", "Roaming"), "Microsoft", "Windows", "Start Menu", "Programs", DISPLAY + ".lnk");
  const desktopLnk = path.join(desktop, DISPLAY + ".lnk");
  const regMark = path.join(userData, "registered-version");
  const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  const ps = (script, opts) => runPowerShell(script, { spawnFn, exe: psExe, ...opts });

  function installedVersion() {
    try { return JSON.parse(asarFs.readFileSync(path.join(installDir, "resources", "app.asar", "package.json"), "utf8")).version; }
    catch (e) { return null; }
  }

  /** Que faire au lancement : rien (déjà installé), ouvrir la version installée, ou installer celle-ci. */
  function decide() {
    if (same(srcDir, installDir)) return { action: "none" };
    if (!fs.existsSync(path.join(srcDir, "resources", "app.asar"))) return { action: "none" }; // lancement de développement
    const iv = installedVersion();
    if (iv && cmpVer(iv, version) >= 0) return { action: "open-installed", installedVersion: iv };
    return { action: "install", upgrade: !!iv };
  }

  function registerScript(dir, exe, unblock) {
    return [
      "$ErrorActionPreference = 'Continue'",
      `$k = ${psQuote(REG_KEY)}`,
      "New-Item -Path $k -Force | Out-Null",
      `Set-ItemProperty -Path $k -Name DisplayName -Value ${psQuote(DISPLAY)}`,
      `Set-ItemProperty -Path $k -Name DisplayVersion -Value ${psQuote(version)}`,
      `Set-ItemProperty -Path $k -Name Publisher -Value ${psQuote("Sürpriz")}`,
      `Set-ItemProperty -Path $k -Name DisplayIcon -Value ${psQuote(exe + ",0")}`,
      `Set-ItemProperty -Path $k -Name InstallLocation -Value ${psQuote(dir)}`,
      `Set-ItemProperty -Path $k -Name UninstallString -Value ${psQuote('"' + exe + '" --uninstall')}`,
      `Set-ItemProperty -Path $k -Name QuietUninstallString -Value ${psQuote('"' + exe + '" --uninstall --quiet')}`,
      "New-ItemProperty -Path $k -Name NoModify -Value 1 -PropertyType DWord -Force | Out-Null",
      "New-ItemProperty -Path $k -Name NoRepair -Value 1 -PropertyType DWord -Force | Out-Null",
      `New-ItemProperty -Path $k -Name EstimatedSize -Value ${dirSizeKb(dir)} -PropertyType DWord -Force | Out-Null`,
      // fichiers venus d'Internet : on retire la marque, sinon Windows redemande l'autorisation au lancement
      unblock ? `Get-ChildItem -LiteralPath ${psQuote(dir)} -Recurse -File | Unblock-File` : ""
    ].join("\r\n");
  }

  function links(exe) {
    const opts = { target: exe, cwd: path.dirname(exe), description: DISPLAY, icon: exe, iconIndex: 0, appUserModelId: APP_ID };
    const ok1 = shell.writeShortcutLink(startMenuLnk, "create", opts);
    const ok2 = shell.writeShortcutLink(desktopLnk, "create", opts);
    if (!ok1 && !ok2) throw new Error("raccourcis impossibles à créer");
  }

  /** Copie l'app dans Programmes, crée les raccourcis, l'inscrit dans Paramètres › Applications. */
  async function install(onStep) {
    onStep("copy");
    const tmp = installDir + ".nouveau", old = installDir + ".ancien";
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(installDir), { recursive: true });
    await fs.promises.cp(srcDir, tmp, { recursive: true, force: true, filter: (s) => !/\.log$/i.test(s) });
    fs.rmSync(old, { recursive: true, force: true });
    if (fs.existsSync(installDir)) {
      try { fs.renameSync(installDir, old); }
      catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); throw Object.assign(new Error("busy"), { step: "copy" }); }
    }
    try { fs.renameSync(tmp, installDir); }
    catch (e) { if (fs.existsSync(old)) fs.renameSync(old, installDir); throw Object.assign(e, { step: "copy" }); }
    try { fs.rmSync(old, { recursive: true, force: true }); } catch (e) { /* sera retiré plus tard */ }
    const exe = installedExe();
    onStep("links");
    try { links(exe); } catch (e) { throw Object.assign(e, { step: "links" }); }
    onStep("register");
    await ps(registerScript(installDir, exe, true));
    try { fs.mkdirSync(userData, { recursive: true }); fs.writeFileSync(regMark, version); } catch (e) { /* rien */ }
    return exe;
  }

  /** Version installée lancée normalement : met à jour la fiche de Paramètres › Applications après une mise à jour. */
  async function refreshRegistration() {
    let mark = null;
    try { mark = fs.readFileSync(regMark, "utf8").trim(); } catch (e) { /* jamais inscrite */ }
    if (mark === version) return false;
    await ps(registerScript(installDir, execPath, false));
    fs.mkdirSync(userData, { recursive: true }); fs.writeFileSync(regMark, version);
    return true;
  }

  function launchInstalled(args = []) {
    const child = (spawnFn || spawn)(installedExe(), args, { detached: true, stdio: "ignore", cwd: installDir });
    child.unref && child.unref();
  }

  /** Désinstallation (depuis Paramètres › Applications) : raccourcis et fiche tout de suite, dossiers une fois le hub fermé. */
  function uninstall(pid) {
    for (const l of [startMenuLnk, desktopLnk]) { try { fs.rmSync(l, { force: true }); } catch (e) { /* rien */ } }
    return ps([
      "$ErrorActionPreference = 'Continue'",
      `try { Wait-Process -Id ${Number(pid)} -Timeout 60 -ErrorAction SilentlyContinue } catch {}`,
      "Start-Sleep -Milliseconds 800",
      `try { Remove-Item -Path ${psQuote(REG_KEY)} -Recurse -Force -ErrorAction Stop } catch {}`,
      `for ($i = 0; $i -lt 10; $i++) { try { Remove-Item -LiteralPath ${psQuote(installDir)} -Recurse -Force -ErrorAction Stop; break } catch { Start-Sleep -Seconds 1 } }`,
      `try { Remove-Item -LiteralPath ${psQuote(userData)} -Recurse -Force -ErrorAction Stop } catch {}`
    ].join("\r\n"), { detached: true });
  }

  return { installDir, startMenuLnk, desktopLnk, decide, install, refreshRegistration, launchInstalled, uninstall, installedVersion, registerScript };
}

module.exports = { createWinInstall, runPowerShell, APP_ID };
