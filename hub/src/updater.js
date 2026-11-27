/* Mise à jour du hub lui-même : téléchargement de la nouvelle version, vérification de l'empreinte,
   remplacement de l'app une fois fermée, puis réouverture. Si le remplacement échoue, l'ancienne app
   est remise en place et rouverte, et le hub l'affiche au démarrage suivant. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile, spawn } = require("child_process");

const STALL_MS = 60000;

function assetKey(platform, arch) {
  if (platform === "darwin") return arch === "arm64" ? "mac-arm64" : "mac-x64";
  if (platform === "win32") return "win-x64";
  return null;
}

const psQuote = (s) => "'" + String(s).replace(/'/g, "''") + "'";

/** Script Mac : attend la fermeture du hub, échange les deux apps, rouvre. En cas d'échec, remet l'ancienne. */
function macScript() {
  return `#!/bin/bash
PID="$1"; OLD="$2"; NEW="$3"; FLAG="$4"; OPEN="\${HUB_OPEN:-open}"
for i in $(seq 1 300); do kill -0 "$PID" 2>/dev/null || break; sleep 0.2; done
sleep 0.5
DEST="$(dirname "$OLD")/$(basename "$NEW")"
BAK="$OLD.ancien-$$"
if mv "$OLD" "$BAK" 2>/dev/null; then
  if [ -e "$DEST" ]; then DEST="$OLD"; fi
  if mv "$NEW" "$DEST" 2>/dev/null; then
    rm -rf "$BAK"
    xattr -dr com.apple.quarantine "$DEST" 2>/dev/null
    "$OPEN" "$DEST"
    exit 0
  fi
  mv "$BAK" "$OLD"
fi
echo "replace" > "$FLAG"
"$OPEN" "$OLD"
`;
}

/** Script Windows (PowerShell 5.1) : attend la fermeture du hub, puis remplace son dossier.
    - dossier propre (seulement les fichiers de l'app) : l'ancien dossier est mis de côté, le nouveau prend sa place,
      et l'ancien revient si quelque chose échoue ;
    - dossier qui contient aussi d'autres fichiers : copie par-dessus, sans rien effacer. */
function winScript({ pid, oldDir, oldExe, newDir, newExe, flag }) {
  return [
    "$ErrorActionPreference = 'Stop'",
    `$hubPid = ${Number(pid)}`,
    `$old = ${psQuote(oldDir)}; $oldExe = ${psQuote(oldExe)}; $new = ${psQuote(newDir)}; $exe = ${psQuote(newExe)}; $flag = ${psQuote(flag)}`,
    "try { Wait-Process -Id $hubPid -Timeout 60 -ErrorAction SilentlyContinue } catch {}",
    "for ($i = 0; $i -lt 60; $i++) {",
    "  $left = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $oldExe }",
    "  if (-not $left) { break }",
    "  Start-Sleep -Milliseconds 500",
    "}",
    "$ok = $false; $foreign = @(); $ready = $false",
    "try {",
    "  if (Test-Path -LiteralPath (Join-Path $new $exe)) {",
    "    $known = @(Get-ChildItem -LiteralPath $new -Force | ForEach-Object { $_.Name.ToLower() })",
    "    $foreign = @(Get-ChildItem -LiteralPath $old -Force | Where-Object { $known -notcontains $_.Name.ToLower() -and $_.Extension -ne '.exe' -and $_.Extension -ne '.log' -and $_.Name -ne 'LISEZ-MOI.txt' })",
    "    $ready = $true",
    "  }",
    "} catch {}",
    "if (-not $ready) {",
    "} elseif ($foreign.Count -eq 0) {",
    "  $bak = $old + '.ancien-' + $hubPid",
    "  $moved = $false",
    "  for ($i = 0; $i -lt 10 -and -not $moved; $i++) { try { Rename-Item -LiteralPath $old -NewName (Split-Path $bak -Leaf); $moved = $true } catch { Start-Sleep -Seconds 1 } }",
    "  if ($moved) {",
    "    try { Move-Item -LiteralPath $new -Destination $old; $ok = $true }",
    "    catch { try { Copy-Item -LiteralPath $new -Destination $old -Recurse -Force; $ok = $true } catch {} }",
    "    if ($ok) { try { Remove-Item -LiteralPath $bak -Recurse -Force } catch {} }",
    "    else {",
    "      try { if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Recurse -Force } } catch {}",
    "      try { Rename-Item -LiteralPath $bak -NewName (Split-Path $old -Leaf) } catch {}",
    "    }",
    "  }",
    "} else {",
    "  for ($i = 0; $i -lt 10 -and -not $ok; $i++) {",
    "    try { Get-ChildItem -LiteralPath $new -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $old -Recurse -Force }; $ok = $true }",
    "    catch { Start-Sleep -Seconds 1 }",
    "  }",
    "}",
    "if ($ok) { Start-Process -FilePath (Join-Path $old $exe) }",
    "else { Set-Content -LiteralPath $flag -Value 'replace'; if (Test-Path -LiteralPath $oldExe) { Start-Process -FilePath $oldExe } }"
  ].join("\r\n");
}

function createUpdater({ fetch, userData, execPath, platform, arch, arm64Translated, allowed, extract, spawnFn }) {
  const dir = path.join(userData, "updates");
  const flag = path.join(userData, "update-failed");
  const key = assetKey(platform, arm64Translated ? "arm64" : arch);

  /** Où se trouve l'app installée, et peut-on la remplacer ? */
  function target() {
    if (platform === "darwin") {
      const bundle = execPath.split("/Contents/MacOS/")[0];
      if (!bundle.endsWith(".app")) return { ok: false, reason: "dev" };
      if (bundle.includes("/AppTranslocation/")) return { ok: false, reason: "translocated" };
      try { fs.accessSync(path.dirname(bundle), fs.constants.W_OK); fs.accessSync(bundle, fs.constants.W_OK); }
      catch (e) { return { ok: false, reason: "readonly" }; }
      return { ok: true, location: bundle };
    }
    if (platform === "win32") {
      const d = path.dirname(execPath);
      if (!fs.existsSync(path.join(d, "resources", "app.asar"))) return { ok: false, reason: "dev" };
      const probe = path.join(d, ".hub-write-test");
      try { fs.writeFileSync(probe, "ok"); fs.rmSync(probe, { force: true }); }
      catch (e) { return { ok: false, reason: "readonly" }; }
      return { ok: true, location: d };
    }
    return { ok: false, reason: "platform" };
  }

  /** Le hub peut-il se mettre à jour tout seul vers la version annoncée ? */
  function check(hub) {
    const asset = hub && hub.assets && key ? hub.assets[key] : null;
    if (!asset || !asset.url || !asset.sha256) return { ok: false, reason: "noasset" };
    if (!allowed(asset.url)) return { ok: false, reason: "noasset" };
    const t = target();
    return t.ok ? { ok: true } : { ok: false, reason: t.reason };
  }

  async function download(asset, dest, onProgress) {
    const ctrl = new AbortController();
    let timer = setTimeout(() => ctrl.abort(), STALL_MS);
    const kick = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), STALL_MS); };
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const fd = fs.openSync(dest, "w");
    const hash = crypto.createHash("sha256");
    try {
      const res = await fetch(asset.url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("téléchargement impossible (HTTP " + res.status + ")");
      const total = Number(res.headers.get("content-length")) || asset.size || 0;
      const reader = res.body.getReader();
      let received = 0, last = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        kick();
        const buf = Buffer.from(value);
        fs.writeSync(fd, buf);
        hash.update(buf);
        received += buf.length;
        if (onProgress && (received - last > 512 * 1024 || received === total)) { last = received; onProgress(received, total); }
      }
      onProgress && onProgress(received, total);
    } finally { clearTimeout(timer); fs.closeSync(fd); }
    const got = hash.digest("hex");
    if (got.toLowerCase() !== String(asset.sha256).toLowerCase()) throw Object.assign(new Error("fichier corrompu (empreinte différente)"), { step: "check" });
    return dest;
  }

  function defaultExtract(zip, dest) {
    if (platform === "darwin") {
      return new Promise((resolve, reject) => execFile("/usr/bin/ditto", ["-x", "-k", zip, dest], (err) => err ? reject(err) : resolve()));
    }
    const AdmZip = require("adm-zip");
    new AdmZip(zip).extractAllTo(dest, true);
    return Promise.resolve();
  }

  /** Repère la nouvelle app dans le dossier décompressé. */
  function findNew(dest) {
    const walk = (d, depth) => {
      for (const name of fs.readdirSync(d)) {
        const p = path.join(d, name);
        if (!fs.statSync(p).isDirectory()) continue;
        if (platform === "darwin" && name.endsWith(".app")) {
          const plist = path.join(p, "Contents", "Info.plist");
          if (fs.existsSync(plist) && fs.readFileSync(plist, "utf8").includes("com.surpriz.hub")) return { app: p };
          continue;
        }
        if (platform === "win32" && fs.existsSync(path.join(p, "resources", "app.asar"))) {
          const exe = fs.readdirSync(p).find((n) => n.toLowerCase().endsWith(".exe"));
          if (exe) return { app: p, exe };
        }
        if (depth < 2) { const r = walk(p, depth + 1); if (r) return r; }
      }
      return null;
    };
    return walk(dest, 0);
  }

  let ready = null; // { oldLocation, app, exe }

  /** Télécharge, vérifie et prépare la nouvelle version. onStep(key, info) suit l'avancement. */
  async function prepare(hub, onStep) {
    const c = check(hub);
    if (!c.ok) throw Object.assign(new Error(c.reason), { step: "download", reason: c.reason });
    const asset = hub.assets[key];
    const t = target();
    fs.rmSync(dir, { recursive: true, force: true });
    const zip = path.join(dir, "hub-" + hub.version + ".zip");
    onStep("download", { received: 0, total: asset.size || 0 });
    try { await download(asset, zip, (r, tot) => onStep("download", { received: r, total: tot })); }
    catch (e) { if (!e.step) e.step = "download"; throw e; }
    onStep("check", {});
    onStep("prepare", {});
    const dest = path.join(dir, "app");
    try {
      await (extract || defaultExtract)(zip, dest);
      fs.rmSync(zip, { force: true });
    } catch (e) { throw Object.assign(new Error("décompression impossible : " + (e.message || e)), { step: "prepare" }); }
    const found = findNew(dest);
    if (!found) throw Object.assign(new Error("archive incomplète"), { step: "prepare" });
    ready = { oldLocation: t.location, app: found.app, exe: found.exe };
    return true;
  }

  /** Lance le remplaçant (détaché) : il attend que le hub se ferme. */
  function launch(pid) {
    if (!ready) throw new Error("rien à installer");
    fs.rmSync(flag, { force: true });
    const run = spawnFn || spawn;
    let child;
    if (platform === "darwin") {
      const script = path.join(dir, "remplacer.sh");
      fs.writeFileSync(script, macScript(), { mode: 0o755 });
      child = run("/bin/bash", [script, String(pid), ready.oldLocation, ready.app, flag], { detached: true, stdio: "ignore" });
    } else {
      const ps = winScript({ pid, oldDir: ready.oldLocation, oldExe: execPath, newDir: ready.app, newExe: ready.exe, flag });
      const encoded = Buffer.from(ps, "utf16le").toString("base64");
      child = run("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-EncodedCommand", encoded],
        { detached: true, stdio: "ignore", windowsHide: true });
    }
    if (child && child.unref) child.unref();
    return true;
  }

  /** Au démarrage : la dernière mise à jour a-t-elle échoué ? (l'indication n'est donnée qu'une fois) */
  function consumeFailure() {
    if (!fs.existsSync(flag)) return false;
    fs.rmSync(flag, { force: true });
    return true;
  }

  function cleanup() { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* rien */ } }

  return { check, prepare, launch, consumeFailure, cleanup, target, key };
}

module.exports = { createUpdater, macScript, winScript, assetKey };
