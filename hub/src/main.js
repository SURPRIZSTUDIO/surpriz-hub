/* SÜRPRIZ HÜB — processus principal (Electron). */
const { app, BrowserWindow, ipcMain, shell, net, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { createCatalog } = require("./catalog");
const { createUpdater } = require("./updater");
const { createWinInstall, APP_ID } = require("./winInstall");

const drivers = { cep: require("./installers/cep") };

/* Nom affiché : SÜRPRIZ HÜB. Les fichiers de l'app restent sans accents (signature Mac plus sûre),
   et les réglages restent dans le même dossier qu'avant. */
const APP_NAME = "SÜRPRIZ HÜB";
app.setPath("userData", path.join(app.getPath("appData"), "Surpriz Hub"));
app.setName(APP_NAME);
app.setAboutPanelOptions({ applicationName: APP_NAME, copyright: "© Sürpriz" });

/* Windows : une seule fenêtre du hub à la fois, regroupée avec ses raccourcis dans la barre des tâches. */
const IS_WIN = process.platform === "win32";
if (IS_WIN) app.setAppUserModelId(APP_ID);
const gotLock = !IS_WIN || app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on("second-instance", (e, argv) => {
  if (winInst && argv.includes("--uninstall")) return uninstallFlow(argv); // désinstallation pendant que le hub est ouvert
  const w = BrowserWindow.getAllWindows()[0];
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});
let winInst = null, winInstallNeeded = false;
const justInstalled = process.argv.includes("--installed");

const BUNDLED_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "addons")
  : path.join(__dirname, "..", "addons");

let catalog = null;
let updater = null;
const toUrl = (p) => pathToFileURL(p).href;

function createWindow() {
  const isMac = process.platform === "darwin";
  const win = new BrowserWindow({
    width: 1080, height: 700, minWidth: 880, minHeight: 580,
    backgroundColor: "#1f1f1f",
    title: APP_NAME,
    show: false,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    trafficLightPosition: { x: 18, y: 18 },
    titleBarOverlay: isMac ? undefined : { color: "#1f1f1f", symbolColor: "#e6e6e6", height: 40 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, "ui", "index.html"));
}

/* ---------- Échanges avec l'interface ---------- */

ipcMain.handle("hub:info", () => ({
  version: app.getVersion(),
  platform: process.platform,
  locale: app.getLocale(),
  // Mac : hors du dossier Applications, l'app ne peut pas se mettre à jour toute seule
  inApplications: process.platform === "darwin" && app.isPackaged ? app.isInApplicationsFolder() : null,
  // Windows : ouvert depuis Téléchargements, le hub s'installe comme une app ; « --installed » juste après
  winInstall: winInstallNeeded,
  justInstalled
}));

/** Catalogue pour l'interface : adresses des images prêtes à afficher, source (en ligne / copie / app). */
ipcMain.handle("hub:catalog", async (e, force) => {
  const { data, source } = await catalog.load(!!force);
  const out = JSON.parse(JSON.stringify(data));
  for (const a of out.addons) {
    const bundledIcon = a.bundled && a.bundled.icon && fs.existsSync(a.bundled.icon) ? toUrl(a.bundled.icon) : null;
    a.iconUrl = (source === "online" && a.icon) ? a.icon : bundledIcon;
    a.shotUrls = {};
    for (const lang of ["fr", "en"]) {
      const online = source === "online" && a.images && a.images[lang] && a.images[lang].length ? a.images[lang] : null;
      const local = a.bundled ? (a.bundled.shots[lang] || []).filter((p) => fs.existsSync(p)).map(toUrl) : [];
      a.shotUrls[lang] = online || local;
    }
    delete a.bundled;
  }
  if (out.hub) out.hub.selfUpdate = updater.check(out.hub);
  return { catalog: out, source, appVersion: app.getVersion() };
});

ipcMain.handle("hub:status", async (e, id) => {
  await catalog.load();
  const a = catalog.find(id);
  return drivers[a.type].status(a);
});

ipcMain.handle("hub:install", async (e, id) => {
  await catalog.load();
  const a = catalog.find(id);
  let payload;
  try { payload = await catalog.payloadFor(a); }
  catch (err) { return { ok: false, steps: [{ key: "download", ok: false, detail: String(err.message || err) }] }; }
  const res = drivers[a.type].install(a, payload.dir);
  res.steps.unshift({ key: "download", ok: true, detail: payload.downloaded ? "downloaded" : "local" });
  return res;
});

ipcMain.handle("hub:uninstall", async (e, id) => {
  await catalog.load();
  const a = catalog.find(id);
  return drivers[a.type].uninstall(a);
});

ipcMain.handle("hub:openGuide", async (e, id, lang) => {
  await catalog.load();
  try {
    const file = await catalog.guideFor(catalog.find(id), lang);
    return file ? (await shell.openPath(file)) === "" : false;
  } catch (err) { return false; }
});

ipcMain.handle("hub:reveal", async (e, id) => {
  await catalog.load();
  const a = catalog.find(id);
  const st = drivers[a.type].status(a);
  if (st.location) shell.showItemInFolder(path.join(st.location, "CSXS", "manifest.xml"));
  return !!st.location;
});

/* ---------- Mise à jour du hub lui-même ---------- */
let updating = false;
ipcMain.handle("hub:selfUpdate", async (e) => {
  if (updating) return { ok: false, step: "download", detail: "déjà en cours" };
  updating = true;
  const send = (step, info) => { if (!e.sender.isDestroyed()) e.sender.send("hub:updateProgress", { step, ...info }); };
  try {
    const { data } = await catalog.load(true);
    await updater.prepare(data.hub, send);
    send("restart", {});
    updater.launch(process.pid);
    setTimeout(() => app.quit(), 1200);
    return { ok: true };
  } catch (err) {
    updating = false;
    return { ok: false, step: err.step || "download", detail: String(err.reason || err.message || err) };
  }
});
ipcMain.handle("hub:updateFailed", () => updater.consumeFailure());

/** Windows : installation comme une app (Programmes, menu Démarrer, Bureau), puis réouverture depuis là. */
let winInstalling = false;
ipcMain.handle("hub:winInstall", async (e) => {
  if (!winInst || !winInstallNeeded || winInstalling) return { ok: false, step: "copy", detail: "indisponible" };
  winInstalling = true;
  const send = (step) => { if (!e.sender.isDestroyed()) e.sender.send("hub:winInstallProgress", { step }); };
  try { await winInst.install(send); }
  catch (err) { winInstalling = false; return { ok: false, step: err.step || "copy", detail: String(err.message || err) }; }
  setTimeout(() => { app.releaseSingleInstanceLock(); winInst.launchInstalled(["--installed"]); app.quit(); }, 2200);
  return { ok: true };
});

/** Mac : range l'app dans Applications (elle se rouvre depuis là). Une ancienne copie du même nom est remplacée. */
ipcMain.handle("hub:moveToApps", () => {
  if (process.platform !== "darwin" || !app.isPackaged || app.isInApplicationsFolder()) return { ok: true, already: true };
  try { return { ok: app.moveToApplicationsFolder({ conflictHandler: () => true }) }; }
  catch (err) { return { ok: false, detail: String(err.message || err) }; }
});

/** Télécharge la nouvelle version dans Téléchargements et la montre dans le Finder / l'Explorateur. */
let fetched = null;
ipcMain.handle("hub:fetchHub", async (e) => {
  const send = (info) => { if (!e.sender.isDestroyed()) e.sender.send("hub:updateProgress", { step: "download", ...info }); };
  try {
    const { data } = await catalog.load(true);
    fetched = await updater.fetchTo(data.hub, app.getPath("downloads"), (received, total) => send({ received, total }));
    shell.showItemInFolder(fetched);
    return { ok: true, name: path.basename(fetched) };
  } catch (err) {
    return { ok: false, detail: String(err.message || err) };
  }
});
ipcMain.handle("hub:revealFetched", () => { if (fetched && fs.existsSync(fetched)) shell.showItemInFolder(fetched); });

ipcMain.handle("hub:openLink", (e, url) => {
  if (catalog.allowed(url)) shell.openExternal(url);
});

app.whenReady().then(() => {
  if (!gotLock) return; // un autre hub est déjà ouvert : il passe au premier plan
  catalog = createCatalog({ fetch: (u, o) => net.fetch(u, o), userData: app.getPath("userData"), bundledDir: BUNDLED_DIR });
  updater = createUpdater({
    fetch: (u, o) => net.fetch(u, o), userData: app.getPath("userData"), execPath: process.execPath,
    platform: process.platform, arch: process.arch, arm64Translated: app.runningUnderARM64Translation, allowed: catalog.allowed
  });
  updater.cleanup();
  if (IS_WIN && app.isPackaged) {
    winInst = createWinInstall({ execPath: process.execPath, env: process.env, version: app.getVersion(), desktop: app.getPath("desktop"), userData: app.getPath("userData"), shell });
    if (process.argv.includes("--uninstall")) return uninstallFlow(process.argv);
    const d = winInst.decide();
    if (d.action === "open-installed") { app.releaseSingleInstanceLock(); winInst.launchInstalled(); app.quit(); return; }
    winInstallNeeded = d.action === "install";
    if (d.action === "none") winInst.refreshRegistration().catch(() => {});
  }
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

/** Désinstallation demandée par Paramètres › Applications. Les addons déjà installés (Toolkit…) restent en place. */
function uninstallFlow(argv) {
  const fr = /^fr/i.test(app.getLocale());
  const quiet = argv.includes("--quiet");
  const choice = quiet ? 0 : dialog.showMessageBoxSync({
    type: "question", title: APP_NAME, defaultId: 0, cancelId: 1, noLink: true,
    buttons: fr ? ["Désinstaller", "Annuler"] : ["Uninstall", "Cancel"],
    message: fr ? "Désinstaller SÜRPRIZ HÜB ?" : "Uninstall SÜRPRIZ HÜB?",
    detail: fr ? "Les addons déjà installés (Toolkit…) restent dans tes logiciels." : "Add-ons already installed (Toolkit…) stay in your software."
  });
  if (choice !== 0) { app.quit(); return; }
  winInst.uninstall(process.pid).finally(() => app.quit());
}
