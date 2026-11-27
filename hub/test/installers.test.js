/* Tests du moteur d'installation CEP, sur un faux dossier utilisateur. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hub-test-"));
process.env.APPDATA = tmp; // sous Linux, le moteur utilise ce dossier comme sur Windows
const cep = require("../src/installers/cep");
const addon = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "addons", "catalog.json"), "utf8")).addons[0];
const payload = path.join(__dirname, "..", "addons", addon.cep.payload);
const ext = cep.userExtDir();

function fakeExt(folder, id, version) {
  fs.mkdirSync(path.join(ext, folder, "CSXS"), { recursive: true });
  fs.writeFileSync(path.join(ext, folder, "CSXS", "manifest.xml"), `<ExtensionManifest ExtensionBundleId="${id}" ExtensionBundleVersion="${version}"></ExtensionManifest>`);
}

// 1. Rien d'installé
let st = cep.status(addon);
assert.strictEqual(st.installed, false); assert.strictEqual(st.legacy.length, 0);

// 2. Anciennes copies sous d'autres noms + un addon étranger à ne pas toucher
fakeExt("sur-core", "com.surpriz.surcore", "0.24.3");
fakeExt("toolkit-test-b", "com.surpriz.tktestb", "1.0.0");
fakeExt("autre-plugin", "com.autre.plugin", "2.0.0");
st = cep.status(addon);
assert.strictEqual(st.installed, false); assert.strictEqual(st.legacy.length, 2, "2 anciennes copies détectées");

// 3. Installation
const res = cep.install(addon, payload);
assert.ok(res.ok, JSON.stringify(res));
assert.deepStrictEqual(res.steps.map((s) => s.key), ["allow", "clean", "copy"]);
assert.ok(!fs.existsSync(path.join(ext, "sur-core")), "ancienne copie retirée");
assert.ok(!fs.existsSync(path.join(ext, "toolkit-test-b")), "panneau de test retiré");
assert.ok(fs.existsSync(path.join(ext, "autre-plugin")), "addon étranger conservé");
assert.ok(fs.existsSync(path.join(ext, "toolkit", "index.html")), "Toolkit copié");
st = cep.status(addon);
assert.strictEqual(st.installed, true); assert.strictEqual(st.version, addon.version); assert.strictEqual(st.legacy.length, 0);

// 4. Réinstallation par-dessus (fichier en trop supprimé)
fs.writeFileSync(path.join(ext, "toolkit", "orphelin.txt"), "x");
assert.ok(cep.install(addon, payload).ok);
assert.ok(!fs.existsSync(path.join(ext, "toolkit", "orphelin.txt")), "copie propre");

// 5. Désinstallation
const un = cep.uninstall(addon);
assert.ok(un.ok); assert.strictEqual(un.removed.length, 1);
assert.strictEqual(cep.status(addon).installed, false);
assert.ok(fs.existsSync(path.join(ext, "autre-plugin")));

// 6. Fichiers de l'addon manquants
const bad = cep.install(addon, path.join(tmp, "nexistepas"));
assert.strictEqual(bad.ok, false); assert.strictEqual(bad.steps[0].key, "payload");

fs.rmSync(tmp, { recursive: true, force: true });
console.log("OK : 6 scénarios d'installation réussis");
