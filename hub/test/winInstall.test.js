/* Test de l'installation Windows « comme une app » (dossiers simulés ; scripts PowerShell joués avec pwsh).
   Usage : node test/winInstall.test.js [chemin pwsh] */
const fs = require("fs"), os = require("os"), path = require("path");
const { spawn, execFileSync } = require("child_process");
const assert = require("assert");
const { createWinInstall } = require("../src/winInstall");

const PWSH = process.argv[2] || "/tmp/pwsh/pwsh";
const HAS_PS = fs.existsSync(PWSH);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(200); } return false; };
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };

function appFolder(dir, version, extra = []) {
  write(path.join(dir, "SURPRIZ HUB.exe"), "exe " + version);
  write(path.join(dir, "resources", "app.asar", "package.json"), JSON.stringify({ version })); // dossier ici, archive dans l'app
  write(path.join(dir, "locales", "fr.pak"), "fr " + version);
  write(path.join(dir, "LISEZ-MOI.txt"), "lis-moi");
  write(path.join(dir, "debug.log"), "journal");
  for (const f of extra) write(path.join(dir, f), f);
  return path.join(dir, "SURPRIZ HUB.exe");
}

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hub-win-"));
  const env = { LOCALAPPDATA: path.join(root, "Local"), APPDATA: path.join(root, "Roaming"), USERPROFILE: root };
  const desktop = path.join(root, "Desktop"), userData = path.join(root, "Roaming", "Surpriz Hub");
  fs.mkdirSync(desktop, { recursive: true });
  const links = [], launched = [], scripts = [];
  const shell = { writeShortcutLink: (p, op, o) => { links.push({ p, op, o }); write(p, "lnk"); return true; } };
  const spawnFn = (cmd, args, opt) => {
    if (cmd === "powershell.exe") {
      scripts.push(Buffer.from(args[args.length - 1], "base64").toString("utf16le"));
      if (HAS_PS) return spawn(PWSH, args.filter((a) => a !== "-WindowStyle" && a !== "Hidden"), opt);
      return { on: (ev, cb) => ev === "exit" && setTimeout(() => cb(0), 10), unref() {} };
    }
    launched.push({ cmd, args }); return { unref() {} };
  };
  const mk = (execPath, version) => createWinInstall({ execPath, env, version, desktop, userData, shell, spawnFn });
  const installDir = path.join(env.LOCALAPPDATA, "Programs", "SURPRIZ HUB");

  // 1. Premier lancement depuis Téléchargements : installation
  const dl = appFolder(path.join(root, "Downloads", "SURPRIZ HUB"), "1.4.0");
  let w = mk(dl, "1.4.0");
  assert.deepStrictEqual(w.decide(), { action: "install", upgrade: false });
  const steps = [];
  const exe = await w.install((s) => steps.push(s));
  assert.deepStrictEqual(steps, ["copy", "links", "register"]);
  assert.strictEqual(exe, path.join(installDir, "SURPRIZ HUB.exe"));
  assert.strictEqual(fs.readFileSync(exe, "utf8"), "exe 1.4.0");
  assert.ok(fs.existsSync(path.join(installDir, "resources", "app.asar", "package.json")));
  assert.ok(!fs.existsSync(path.join(installDir, "debug.log")), "journaux non copiés");
  assert.deepStrictEqual(links.map((l) => path.basename(l.p)), ["SÜRPRIZ HÜB.lnk", "SÜRPRIZ HÜB.lnk"]);
  assert.ok(links[0].p.includes(path.join("Start Menu", "Programs")) && links[1].p.startsWith(desktop));
  assert.strictEqual(links[0].o.target, exe); assert.strictEqual(links[0].o.appUserModelId, "com.surpriz.hub");
  assert.ok(/DisplayName -Value 'SÜRPRIZ HÜB'/.test(scripts[0]) && /'"[^']*SURPRIZ HUB\.exe" --uninstall'/.test(scripts[0]) && /Unblock-File/.test(scripts[0]));
  assert.strictEqual(fs.readFileSync(path.join(userData, "registered-version"), "utf8"), "1.4.0");
  assert.deepStrictEqual(fs.readdirSync(path.dirname(installDir)), ["SURPRIZ HUB"], "pas de dossier temporaire oublié");
  console.log("ok : installation depuis Téléchargements");

  // 2. Rouvrir la même version (ou plus ancienne) depuis Téléchargements : on ouvre l'app installée
  assert.strictEqual(mk(dl, "1.4.0").decide().action, "open-installed");
  assert.strictEqual(mk(dl, "1.3.2").decide().action, "open-installed");
  mk(dl, "1.4.0").launchInstalled();
  assert.strictEqual(launched[0].cmd, exe);
  // lancée depuis le dossier installé : rien à faire ; fiche Paramètres mise à jour seulement si la version change
  const inst = mk(exe, "1.4.0");
  assert.strictEqual(inst.decide().action, "none");
  assert.strictEqual(await inst.refreshRegistration(), false);
  assert.strictEqual(await mk(exe, "1.4.1").refreshRegistration(), true);
  assert.ok(/DisplayVersion -Value '1\.4\.1'/.test(scripts[scripts.length - 1]));
  console.log("ok : version installée ouverte, fiche à jour");

  // 3. Version plus récente téléchargée : remplace l'installation (anciens fichiers retirés)
  write(path.join(installDir, "ancien.dll"), "x");
  const dl2 = appFolder(path.join(root, "Downloads", "v2", "SURPRIZ HUB"), "1.5.0");
  w = mk(dl2, "1.5.0");
  assert.deepStrictEqual(w.decide(), { action: "install", upgrade: true });
  await w.install(() => {});
  assert.strictEqual(fs.readFileSync(path.join(installDir, "SURPRIZ HUB.exe"), "utf8"), "exe 1.5.0");
  assert.ok(!fs.existsSync(path.join(installDir, "ancien.dll")));
  assert.deepStrictEqual(fs.readdirSync(path.dirname(installDir)), ["SURPRIZ HUB"]);
  console.log("ok : mise à niveau par une version plus récente");

  // 4. Scripts PowerShell valides (analyse syntaxique) — l'inscription réelle se fait dans le registre de Windows
  if (HAS_PS) {
    const f = path.join(root, "s.ps1");
    for (const s of [w.registerScript(installDir, exe, true), scripts[scripts.length - 1]]) {
      fs.writeFileSync(f, s);
      execFileSync(PWSH, ["-NoProfile", "-Command", `$e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${f}', [ref]$null, [ref]$e); if ($e.Count) { $e | ForEach-Object { $_.Message }; exit 1 }`]);
    }
    console.log("ok : scripts PowerShell valides");
  }

  // 5. Désinstallation : raccourcis tout de suite, dossiers une fois le hub fermé
  const fakeHub = spawn("sleep", ["1"]);
  await mk(exe, "1.5.0").uninstall(fakeHub.pid);
  assert.ok(!links.some((l) => fs.existsSync(l.p)), "raccourcis retirés");
  if (HAS_PS) {
    assert.ok(await until(() => !fs.existsSync(installDir) && !fs.existsSync(userData), 20000), "dossiers retirés");
    console.log("ok : désinstallation");
  }
  console.log("OK : installation Windows");
})().catch((e) => { console.error("ÉCHEC", e); process.exit(1); });
