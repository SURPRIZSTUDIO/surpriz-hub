/* Pont entre le panneau (HTML/JS) et After Effects (ExtendScript).
   Remplace CSInterface.js pour ce dont on a besoin. Hors d'AE (navigateur),
   un mode simulation permet de travailler l'interface. */
(function () {
  var cep = window.__adobe_cep__;
  var inAE = !!cep;
  var nodeRequire = (window.cep_node && window.cep_node.require) || window.require || null;

  function extensionPath() {
    if (!inAE) return "";
    var p = decodeURI(cep.getSystemPath("extension"));
    // "file:///C:/..." (Windows) ou "file:///Users/..." (Mac)
    if (/^file:\/\/\/[A-Za-z]:/.test(p)) return p.slice(8);
    return p.replace(/^file:\/\//, "");
  }

  function rawEval(script) {
    return new Promise(function (resolve) {
      cep.evalScript(script, function (res) { resolve(res == null ? "" : String(res)); });
    });
  }

  /* Le script After Effects (jsx/host.jsx) est chargé ici, au premier appel, plutôt que par le manifeste :
     After Effects 27 n'ouvre plus le panneau quand il est déclaré dans le manifeste. */
  var hostReady = null;
  function ensureHost() {
    if (!hostReady) {
      var file = extensionPath() + "/jsx/host.jsx";
      hostReady = rawEval(
        "(function(){try{if(!$.global.SZ||!$.global.SZ.loadModule){$.evalFile(new File(" + JSON.stringify(file) + "));}" +
        "return 'OK';}catch(e){return 'ERR:'+e.toString();}})()"
      ).then(function (r) { if (r.indexOf("ERR:") === 0) console.warn("Toolkit host.jsx : " + r); return r; });
    }
    return hostReady;
  }

  function evalScript(script) {
    if (!inAE) {
      console.log("[simulation] " + script);
      return Promise.resolve("OK:(simulation hors After Effects)");
    }
    return ensureHost().then(function () { return rawEval(script); });
  }

  /** Appelle une fonction ExtendScript avec des arguments sérialisés proprement. */
  function call(fnName, args) {
    var a = (args || []).map(function (v) { return JSON.stringify(v); }).join(",");
    return evalScript(fnName + "(" + a + ")");
  }

  function openURL(url) {
    if (window.cep && window.cep.util) window.cep.util.openURLInDefaultBrowser(url);
    else window.open(url, "_blank");
  }

  window.SZBridge = {
    inAE: inAE,
    node: nodeRequire,
    extensionPath: extensionPath,
    evalScript: evalScript,
    call: call,
    openURL: openURL
  };
})();
