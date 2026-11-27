/* Fiche des fichiers d'une version du hub (adresse, empreinte, taille) pour le catalogue.
   Usage : node tools/assets.js <dossier des zips> <version> */
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const [dir, version] = process.argv.slice(2);
const REPO = "https://github.com/SURPRIZSTUDIO/surpriz-hub";
const FILES = { "mac-arm64": "Surpriz-Hub-Mac-AppleSilicon.zip", "mac-x64": "Surpriz-Hub-Mac-Intel.zip", "win-x64": "Surpriz-Hub-Windows.zip" };
const assets = {};
for (const [key, file] of Object.entries(FILES)) {
  const buf = fs.readFileSync(path.join(dir, file));
  assets[key] = { url: `${REPO}/releases/download/hub-v${version}/${file}`, sha256: crypto.createHash("sha256").update(buf).digest("hex"), size: buf.length };
}
process.stdout.write(JSON.stringify({ version, download: `${REPO}/releases/latest`, assets }, null, 2) + "\n");
