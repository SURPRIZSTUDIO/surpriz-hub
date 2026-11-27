/* Pont limité entre l'interface et le système : seules ces fonctions sont accessibles. */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hub", {
  info: () => ipcRenderer.invoke("hub:info"),
  catalog: (force) => ipcRenderer.invoke("hub:catalog", !!force),
  status: (id) => ipcRenderer.invoke("hub:status", id),
  install: (id) => ipcRenderer.invoke("hub:install", id),
  uninstall: (id) => ipcRenderer.invoke("hub:uninstall", id),
  openGuide: (id, lang) => ipcRenderer.invoke("hub:openGuide", id, lang),
  reveal: (id) => ipcRenderer.invoke("hub:reveal", id),
  openLink: (url) => ipcRenderer.invoke("hub:openLink", url),
  selfUpdate: () => ipcRenderer.invoke("hub:selfUpdate"),
  updateFailed: () => ipcRenderer.invoke("hub:updateFailed"),
  moveToApps: () => ipcRenderer.invoke("hub:moveToApps"),
  fetchHub: () => ipcRenderer.invoke("hub:fetchHub"),
  revealFetched: () => ipcRenderer.invoke("hub:revealFetched"),
  onUpdateProgress: (cb) => {
    const h = (e, info) => cb(info);
    ipcRenderer.on("hub:updateProgress", h);
    return () => ipcRenderer.removeListener("hub:updateProgress", h);
  }
});
