/* Test dans Electron lui-même (où les .asar sont lus comme des dossiers) : la mise à jour Windows et
   l'installation « comme une app » doivent garder app.asar intact.
   Usage : xvfb-run -a npx electron test/electron-asar.test.js --no-sandbox */
const { app } = require("electron");
const ofs = require("original-fs"), path = require("path"), os = require("os"), crypto = require("crypto");
const { execFileSync } = require("child_process");
const { createUpdater } = require("../src/updater");
const { createWinInstall } = require("../src/winInstall");
const { allowed } = require("../src/catalog");

app.whenReady().then(async () => {
  let ok = true;
  const check = (cond, label) => { console.log((cond ? "ok : " : "ÉCHEC : ") + label); if (!cond) ok = false; };
  try {
    const root = ofs.mkdtempSync(path.join(os.tmpdir(), "hub-asar-"));
    const asar = path.join(path.dirname(process.execPath), "resources", "default_app.asar"); // une vraie archive .asar
    const mkApp = (dir, v) => {
      ofs.mkdirSync(path.join(dir, "resources"), { recursive: true });
      ofs.copyFileSync(asar, path.join(dir, "resources", "app.asar"));
      ofs.writeFileSync(path.join(dir, "SURPRIZ HUB.exe"), "exe " + v);
    };
    // 1. mise à jour : décompression de la nouvelle version (adm-zip) dans le hub
    const inst = path.join(root, "Programs", "SURPRIZ HUB"); mkApp(inst, "1");
    const stage = path.join(root, "zip", "SURPRIZ HUB"); mkApp(stage, "2");
    const zipFile = path.join(root, "new.zip");
    execFileSync("python3", ["-c", "import shutil,sys; shutil.make_archive(sys.argv[1][:-4], 'zip', sys.argv[2])", zipFile, path.dirname(stage)]);
    const zip = ofs.readFileSync(zipFile);
    const up = createUpdater({ fetch: async () => new Response(zip), userData: path.join(root, "userData"), execPath: path.join(inst, "SURPRIZ HUB.exe"),
      platform: "win32", arch: "x64", allowed });
    await up.prepare({ version: "2.0.0", assets: { "win-x64": { url: "https://github.com/SURPRIZSTUDIO/surpriz-hub/releases/download/hub-v2.0.0/w.zip",
      sha256: crypto.createHash("sha256").update(zip).digest("hex"), size: zip.length } } }, () => {});
    const got = path.join(root, "userData", "updates", "app", "SURPRIZ HUB", "resources", "app.asar");
    check(ofs.statSync(got).isFile() && ofs.statSync(got).size === ofs.statSync(asar).size, "mise à jour : app.asar décompressé intact");
    up.cleanup();
    check(!ofs.existsSync(path.join(root, "userData", "updates")), "mise à jour : dossier temporaire nettoyé");
    // 2. installation « comme une app » : copie de Téléchargements vers Programmes
    const dl = path.join(root, "Downloads", "SURPRIZ HUB"); mkApp(dl, "3");
    const w = createWinInstall({ execPath: path.join(dl, "SURPRIZ HUB.exe"), env: { LOCALAPPDATA: path.join(root, "Local"), APPDATA: path.join(root, "Roaming") },
      version: "3.0.0", desktop: root, userData: path.join(root, "ud"), shell: { writeShortcutLink: () => true },
      spawnFn: () => ({ on: (ev, cb) => ev === "exit" && setTimeout(() => cb(0), 5), unref() {} }) });
    await w.install(() => {});
    const inst2 = path.join(root, "Local", "Programs", "SURPRIZ HUB", "resources", "app.asar");
    check(ofs.statSync(inst2).isFile() && ofs.statSync(inst2).size === ofs.statSync(asar).size, "installation : app.asar copié intact");
    check(process.noAsar !== true, "réglage d'Electron rétabli après coup");
  } catch (e) { console.log("ÉCHEC : " + (e.stack || e)); ok = false; }
  console.log(ok ? "OK : app.asar dans Electron" : "ÉCHEC : app.asar dans Electron");
  app.exit(ok ? 0 : 1);
});
