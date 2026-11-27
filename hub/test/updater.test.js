/* Test de la mise à jour du hub : téléchargement, vérification, puis remplacement réel de l'app
   (script Mac joué avec bash, script Windows joué avec PowerShell). Usage : node test/updater.test.js [chemin pwsh] */
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
const { execFileSync, spawn } = require("child_process");
const assert = require("assert");
const { createUpdater } = require("../src/updater");
const { allowed } = require("../src/catalog");

const PWSH = process.argv[2] || "/tmp/pwsh/pwsh";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(200); } return false; };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "hub-upd-"));
const write = (p, s, mode) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, mode ? { mode } : undefined); };

function makeZip(files) {
  const dir = tmp(), zip = path.join(tmp(), "new.zip");
  for (const [rel, content, mode] of files) write(path.join(dir, rel), content, mode);
  execFileSync("python3", ["-c", `import shutil,sys; shutil.make_archive(sys.argv[1][:-4], 'zip', sys.argv[2])`, zip, dir]);
  return fs.readFileSync(zip);
}
const fakeFetch = (buf) => async () => new Response(buf, { status: 200, headers: { "content-length": String(buf.length) } });
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const URL_OK = "https://github.com/SURPRIZSTUDIO/surpriz-hub/releases/download/hub-v9.0.0/x.zip";
const unzip = (zip, dest) => { fs.mkdirSync(dest, { recursive: true }); execFileSync("unzip", ["-q", zip, "-d", dest]); };

async function mac(failCase) {
  const root = tmp();
  const old = path.join(root, "Applications", "SURPRIZ HUB.app");
  write(path.join(old, "Contents", "Info.plist"), "<string>com.surpriz.hub</string><string>1.2.0</string>");
  write(path.join(old, "Contents", "MacOS", "SURPRIZ HUB"), "old", 0o755);
  const zip = makeZip([["SURPRIZ HUB.app/Contents/Info.plist", "<string>com.surpriz.hub</string><string>9.0.0</string>"],
                       ["SURPRIZ HUB.app/Contents/MacOS/SURPRIZ HUB", "new", 0o755]]);
  const userData = path.join(root, "userData");
  const opened = path.join(root, "opened.txt");
  write(path.join(root, "bin", "open"), `#!/bin/bash\necho "$1" > "${opened}"\n`, 0o755);
  const hub = { version: "9.0.0", assets: { "mac-arm64": { url: URL_OK, sha256: sha(zip), size: zip.length } } };
  const up = createUpdater({ fetch: fakeFetch(zip), userData, execPath: path.join(old, "Contents", "MacOS", "SURPRIZ HUB"),
    platform: "darwin", arch: "arm64", allowed, extract: async (z, d) => unzip(z, d),
    spawnFn: (cmd, args, opt) => spawn(cmd, args, { ...opt, env: { ...process.env, HUB_OPEN: path.join(root, "bin", "open") } }) });
  assert.deepStrictEqual(up.check(hub), { ok: true });
  const steps = [];
  await up.prepare(hub, (s) => steps.push(s));
  assert.deepStrictEqual([...new Set(steps)], ["download", "check", "prepare"]);
  if (failCase) fs.rmSync(path.join(userData, "updates", "app"), { recursive: true, force: true });
  const fakeHub = spawn("sleep", ["1.5"]);
  up.launch(fakeHub.pid);
  assert.ok(await until(() => fs.existsSync(opened), 10000), "app rouverte");
  const plist = fs.readFileSync(path.join(old, "Contents", "Info.plist"), "utf8");
  const leftovers = fs.readdirSync(path.join(root, "Applications"));
  if (failCase) {
    assert.ok(plist.includes("1.2.0"), "ancienne app remise en place");
    assert.strictEqual(up.consumeFailure(), true); assert.strictEqual(up.consumeFailure(), false);
  } else {
    assert.ok(plist.includes("9.0.0"), "nouvelle version en place");
    assert.strictEqual(up.consumeFailure(), false);
  }
  assert.deepStrictEqual(leftovers, ["SURPRIZ HUB.app"], "pas de copie oubliée");
  assert.strictEqual(fs.readFileSync(opened, "utf8").trim(), old);
}

async function win(mode) {
  const root = tmp();
  const docs = path.join(root, "Documents"), old = path.join(docs, "SURPRIZ HUB");
  const opened = path.join(root, "opened.txt");
  const launcher = (tag) => `#!/bin/bash\necho "${tag}" > "${opened}"\n`;
  write(path.join(old, "SURPRIZ HUB.exe"), launcher("old"), 0o755);
  write(path.join(old, "resources", "app.asar"), "old-asar");
  write(path.join(old, "locales", "fr.pak"), "old-fr");
  write(path.join(old, "LISEZ-MOI.txt"), "lis-moi");
  if (mode === "inplace") write(path.join(old, "mes-notes.txt"), "à garder");
  const zip = makeZip([["SURPRIZ HUB/SURPRIZ HUB.exe", launcher("new"), 0o755], ["SURPRIZ HUB/resources/app.asar", "new-asar"],
                       ["SURPRIZ HUB/locales/fr.pak", "new-fr"], ["SURPRIZ HUB/locales/en.pak", "new-en"]]);
  const userData = path.join(root, "userData");
  const hub = { version: "9.0.0", assets: { "win-x64": { url: URL_OK, sha256: sha(zip), size: zip.length } } };
  const up = createUpdater({ fetch: fakeFetch(zip), userData, execPath: path.join(old, "SURPRIZ HUB.exe"),
    platform: "win32", arch: "x64", allowed,
    spawnFn: (cmd, args, opt) => spawn(cmd === "powershell.exe" ? PWSH : cmd, args.filter((a) => a !== "-WindowStyle" && a !== "Hidden"), opt) });
  assert.deepStrictEqual(up.check(hub), { ok: true });
  await up.prepare(hub, () => {});
  const newDir = path.join(userData, "updates", "app", "SURPRIZ HUB");
  // sous Linux, l'archive décompressée perd le droit d'exécution (sans objet sous Windows)
  fs.chmodSync(path.join(newDir, "SURPRIZ HUB.exe"), 0o755);
  if (mode === "swapfail") fs.rmSync(newDir, { recursive: true, force: true }); // la nouvelle version disparaît : échec forcé
  const fakeHub = spawn("sleep", ["1.5"]);
  up.launch(fakeHub.pid);
  assert.ok(await until(() => fs.existsSync(opened), 30000), "app relancée");
  const read = (rel) => fs.readFileSync(path.join(old, rel), "utf8");
  assert.deepStrictEqual(fs.readdirSync(docs), ["SURPRIZ HUB"], "pas de dossier oublié");
  if (mode === "swapfail") {
    assert.strictEqual(fs.readFileSync(opened, "utf8").trim(), "old");
    assert.strictEqual(read("resources/app.asar"), "old-asar", "ancienne version intacte");
    assert.strictEqual(up.consumeFailure(), true);
    return;
  }
  assert.strictEqual(fs.readFileSync(opened, "utf8").trim(), "new");
  assert.strictEqual(read("resources/app.asar"), "new-asar");
  assert.strictEqual(read("locales/fr.pak"), "new-fr"); assert.strictEqual(read("locales/en.pak"), "new-en");
  assert.ok(!fs.existsSync(path.join(old, "locales", "locales")), "dossiers fusionnés, pas imbriqués");
  assert.strictEqual(up.consumeFailure(), false);
  if (mode === "inplace") assert.strictEqual(read("mes-notes.txt"), "à garder", "les autres fichiers sont gardés");
  else assert.ok(!fs.existsSync(path.join(old, "LISEZ-MOI.txt")), "dossier remplacé en entier");
}

async function guards() {
  const root = tmp();
  const zip = makeZip([["x.txt", "x"]]);
  const mk = (execPath, platform, fetchBuf, extra) => createUpdater({ fetch: fakeFetch(fetchBuf || zip), userData: path.join(root, "u"), execPath, platform, arch: "arm64", allowed, ...extra });
  const app = path.join(root, "Applications", "SURPRIZ HUB.app"); write(path.join(app, "Contents", "Info.plist"), "com.surpriz.hub");
  const exe = path.join(app, "Contents", "MacOS", "SURPRIZ HUB");
  // pas de fichier pour ce système, adresse étrangère, app lancée depuis Téléchargements sans être déplacée
  assert.strictEqual(mk(exe, "darwin").check({ version: "9", assets: { "win-x64": { url: URL_OK, sha256: "1" } } }).reason, "noasset");
  assert.strictEqual(mk(exe, "darwin").check({ version: "9", assets: { "mac-arm64": { url: "https://exemple.com/x.zip", sha256: "1" } } }).reason, "noasset");
  assert.strictEqual(mk("/private/var/folders/x/AppTranslocation/ABC/d/SURPRIZ HUB.app/Contents/MacOS/SURPRIZ HUB", "darwin")
    .check({ version: "9", assets: { "mac-arm64": { url: URL_OK, sha256: "1" } } }).reason, "translocated");
  // empreinte fausse : refus, rien n'est préparé
  const up = mk(exe, "darwin", null, { extract: async (z, d) => unzip(z, d) });
  await assert.rejects(() => up.prepare({ version: "9", assets: { "mac-arm64": { url: URL_OK, sha256: "00", size: zip.length } } }, () => {}),
    (e) => e.step === "check" && /corrompu/.test(e.message));
  assert.throws(() => up.launch(1), /rien à installer/);
  // téléchargement direct dans un dossier (Téléchargements) : fichier vérifié, nommé avec la version
  const dl = path.join(root, "Downloads"); fs.mkdirSync(dl);
  const good = { version: "9.1.0", assets: { "mac-arm64": { url: URL_OK.replace("x.zip", "Surpriz-Hub-Mac-AppleSilicon.zip"), sha256: sha(zip), size: zip.length } } };
  const file = await mk(exe, "darwin").fetchTo(good, dl, () => {});
  assert.strictEqual(path.basename(file), "Surpriz-Hub-Mac-AppleSilicon-9.1.0.zip");
  assert.strictEqual(sha(fs.readFileSync(file)), sha(zip));
  good.assets["mac-arm64"].sha256 = "00";
  await assert.rejects(() => mk(exe, "darwin").fetchTo({ ...good, version: "9.2.0" }, dl, () => {}), /corrompu/);
  assert.deepStrictEqual(fs.readdirSync(dl), ["Surpriz-Hub-Mac-AppleSilicon-9.1.0.zip"], "fichier abîmé effacé");
}

(async () => {
  await guards(); console.log("ok : garde-fous");
  await mac(false); console.log("ok : Mac, remplacement");
  await mac(true); console.log("ok : Mac, échec → ancienne app remise");
  if (fs.existsSync(PWSH)) {
    await win("swap"); console.log("ok : Windows, remplacement du dossier");
    await win("swapfail"); console.log("ok : Windows, échec → ancienne app remise et relancée");
    await win("inplace"); console.log("ok : Windows, dossier partagé → copie sans rien effacer");
  } else console.log("PowerShell absent : tests Windows sautés");
  console.log("OK : mise à jour du hub");
})().catch((e) => { console.error("ÉCHEC", e); process.exit(1); });
