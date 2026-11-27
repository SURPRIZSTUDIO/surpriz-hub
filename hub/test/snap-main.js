/* Lance la vraie app, parcourt les écrans et enregistre des captures (test sans écran). */
const fs = require("fs"), os = require("os"), path = require("path");
process.env.APPDATA = fs.mkdtempSync(path.join(os.tmpdir(), "hub-snap-"));
// une ancienne copie, pour voir l'état « ancienne version »
const old = path.join(process.env.APPDATA, "Adobe", "CEP", "extensions", "sur-core", "CSXS");
fs.mkdirSync(old, { recursive: true });
fs.writeFileSync(path.join(old, "manifest.xml"), '<ExtensionManifest ExtensionBundleId="com.surpriz.surcore" ExtensionBundleVersion="0.24.3">');
const { app } = require("electron");
require("../src/main.js");
const OUT = path.join(__dirname, "out");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.on("browser-window-created", (e, win) => {
  const errors = [];
  win.webContents.on("console-message", (ev) => { if (ev.level === "error" || ev.level === 3) errors.push(ev.message); });
  win.webContents.once("did-finish-load", async () => {
    const js = (c) => win.webContents.executeJavaScript(c);
    const shot = async (name) => { await wait(500); fs.writeFileSync(path.join(OUT, name + ".png"), (await win.webContents.capturePage()).toPNG()); };
    try {
      await js("localStorage.setItem('hub.lang','fr')"); win.webContents.reload(); await wait(1500);
      await shot("1-liste");
      await js("document.querySelector('[data-act=detail]').click()"); await shot("2-fiche");
      await js("document.getElementById('view').scrollTop = 99999"); await shot("3-fiche-bas");
      await js("document.getElementById('view').scrollTop = 0; document.querySelector('[data-act=install]').click()"); await wait(1600); await shot("4-installation");
      await js("document.querySelector('[data-act=close]').click()"); await shot("5-installe");
      await js("document.querySelector('[data-lang=en]').click(); document.querySelector('[data-act=list]').click()"); await shot("6-liste-en");
      const ext = path.join(process.env.APPDATA, "Adobe", "CEP", "extensions");
      fs.writeFileSync(path.join(OUT, "result.txt"), "extensions: " + fs.readdirSync(ext).join(", ") + "\nsource: " + (await js("document.getElementById('net').textContent")) + "\nerreurs: " + JSON.stringify(errors) + "\n");
    } catch (err) { fs.writeFileSync(path.join(OUT, "result.txt"), "ECHEC " + err.stack); }
    app.exit(0);
  });
});
