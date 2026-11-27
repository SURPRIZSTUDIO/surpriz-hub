/* Module Expressions — interface. */
SZ.register({
  id: "expressions",
  name: "Expressions",
  order: 5,

  pin: function (btn, api) {
    if (!btn.classList.contains("ex-row")) return null;
    var m = api.store.get("expr.mine", [])[+btn.dataset.i];
    return m ? { fn: "SZ.expr.applyCustom", args: [m.name, m.code], label: m.name } : null;
  },

  mount: function (el, api) {
    var presets = [
      ["bounce", "Rebond", "La valeur rebondit après la dernière clé, comme une balle.", "M3 20 Q8 2 13 20 Q16 10 19 20 Q20.5 15 22 20"],
      ["inertia", "Inertie", "Dépassement amorti à l'arrivée, effet ressort.", "M2 18 C6 18 7 4 12 4 C15 4 15 9 17 9 C19 9 19 7 22 7"],
      ["wiggle", "Wiggle", "Mouvement aléatoire réglable, bouclable.", "M2 12 L5 7 L8 15 L11 6 L14 17 L17 9 L20 14 L22 11"],
      ["blink", "Clignotement", "Fait clignoter la propriété (idéal sur l'Opacité).", "M2 17h4V7h4v10h4V7h4v10h4"],
      ["spin", "Rotation", "Rotation continue à vitesse réglable (sur la Rotation).", "M20 12a8 8 0 1 1-3-6.2 M20 4v5h-5"],
      ["counter", "Compteur", "Compteur de chiffres animable, sur le Texte source d'un calque de texte.", "M4 7h3v10 M10 7h5v5h-5v5h5 M18 7h3v10h-3 M18 12h3"],
      ["loopCycle", "Boucle", "Rejoue les clés en boucle.", "M2 18 L7 6 L7 18 L12 6 L12 18 L17 6 L17 18 L22 6"],
      ["loopPingpong", "Aller-retour", "Rejoue les clés à l'endroit puis à l'envers.", "M2 18 L7 6 L12 18 L17 6 L22 18"],
      ["loopOffset", "Cumulée", "Boucle en repartant de la dernière valeur (escalier, rotation continue).", "M2 21 Q5 21 7 16 Q9 16 12 11 Q14 11 17 6 Q19 6 22 2"],
      ["loopContinue", "Continuer", "Prolonge le mouvement à la vitesse de la dernière clé.", "M2 20 C6 20 8 10 12 10 M12 10 L22 4"]
    ];
    var mine = api.store.get("expr.mine", []);   // [{ name, code }]
    var editing = -1;

    el.innerHTML =
      '<div class="section-title">Presets</div>' +
      '<div class="ex-grid">' + presets.map(function (a) {
        return '<button class="ex-tile" data-id="' + a[0] + '" title="' + a[2] + '">' +
          '<svg viewBox="0 0 24 24"><path d="' + a[3] + '"/></svg><b>' + a[1] + '</b></button>';
      }).join("") + '</div>' +

      '<div class="c-head mt"><span class="section-title">Mes expressions</span>' +
      '  <button class="icon-btn" id="ex-import" title="Importer (.json, .txt, .jsx)">' +
      '    ' + SZIcon("import") + '</button>' +
      '  <button class="icon-btn" id="ex-export" title="Exporter ma bibliothèque">' +
      '    ' + SZIcon("export") + '</button>' +
      '</div>' +
      '<div class="ex-mine" id="ex-mine"></div>' +
      '<button class="btn btn-ic ex-add" id="ex-add">' + SZIcon("plus") + '<span>Nouvelle expression</span></button>' +

      '<div class="ex-editor" id="ex-editor" hidden>' +
      '  <input class="input" id="ex-name" placeholder="Nom (ex. Rotation infinie)" spellcheck="false">' +
      '  <textarea class="input" id="ex-code" rows="6" spellcheck="false" placeholder="Colle ton expression ici…"></textarea>' +
      '  <div class="btn-row">' +
      '    <button class="btn grow" id="ex-capture" title="Récupère l\'expression de la propriété sélectionnée dans After Effects">' + SZIcon("copy") + '<span>Depuis la sélection</span></button>' +
      '  </div>' +
      '  <div class="btn-row">' +
      '    <button class="btn grow" id="ex-cancel">Annuler</button>' +
      '    <button class="btn primary grow" id="ex-save">Enregistrer</button>' +
      '  </div>' +
      '</div>' +

      '<div class="btn-row mt"><button class="btn grow" id="ex-clear">Retirer les expressions</button></div>' +
      '<p class="hint mt">Sélectionne une ou plusieurs propriétés (Position, Échelle, Rotation…), puis clique.<br>' +
      'Les réglages apparaissent dans les effets du calque (ex. « Inertie · Amplitude »).</p>';

    var $ = function (id) { return el.querySelector("#" + id); };
    function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
    function save() { api.store.set("expr.mine", mine); }

    // Dessins des presets : recentrés sur leur encre réelle (certains tracés étaient décalés dans leur carré)
    el.querySelectorAll(".ex-tile svg").forEach(function (svg) {
      try {
        var bb = svg.getBBox();
        if (!bb.width && !bb.height) return;
        var cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
        svg.setAttribute("viewBox", (cx - 12) + " " + (cy - 12) + " 24 24");
      } catch (e) {}
    });

    // Presets intégrés
    el.querySelectorAll("[data-id]").forEach(function (b) {
      b.onclick = function () { api.run("SZ.expr.apply", [b.dataset.id]); };
    });
    $("ex-clear").onclick = function () { api.run("SZ.expr.clear", []); };

    /* ----- Bibliothèque perso ----- */
    function renderMine() {
      var box = $("ex-mine");
      if (!mine.length) {
        box.innerHTML = '<p class="sw-empty">Enregistre tes expressions favorites pour les poser en un clic.</p>';
        return;
      }
      box.innerHTML = mine.map(function (m, i) {
        var first = m.code.split("\n").filter(function (l) { return l.trim() && l.trim().indexOf("//") !== 0; })[0] || m.code;
        return '<div class="ex-row" data-pin data-i="' + i + '" title="Cliquer pour appliquer">' +
          '<span><b>' + esc(m.name) + '</b><small>' + esc(first.trim()) + '</small></span>' +
          '<i class="ex-act" data-a="edit" title="Modifier">' + SZIcon("pencil") + '</i>' +
          '<i class="ex-act del-btn" data-a="del" title="Supprimer">' + SZDel.html() + '</i></div>';
      }).join("");
      box.querySelectorAll(".ex-row").forEach(function (row) {
        var i = +row.dataset.i;
        row.onclick = function (e) {
          var a = e.target.dataset && e.target.dataset.a;
          if (a === "del") {
            row.classList.add("armed");
            setTimeout(function () { row.classList.remove("armed"); }, 2500);
            if (!SZDel.confirm(e.target)) return;
            mine.splice(i, 1); save(); return renderMine();
          }
          if (a === "edit") return openEditor(i);
          api.run("SZ.expr.applyCustom", [mine[i].name, mine[i].code]);
        };
      });
    }

    function openEditor(i) {
      editing = i;
      $("ex-name").value = i >= 0 ? mine[i].name : "";
      $("ex-code").value = i >= 0 ? mine[i].code : "";
      $("ex-editor").hidden = false;
      $("ex-add").hidden = true;
      $("ex-save").textContent = i >= 0 ? "Mettre à jour" : "Enregistrer";
      (i >= 0 ? $("ex-code") : $("ex-name")).focus();
    }
    function closeEditor() {
      editing = -1;
      $("ex-editor").hidden = true;
      $("ex-add").hidden = false;
    }

    $("ex-add").onclick = function () { openEditor(-1); };
    $("ex-cancel").onclick = closeEditor;

    $("ex-capture").onclick = function () {
      api.call("SZ.expr.capture", []).then(function (r) {
        if (r.indexOf("EXP:") !== 0) return api.status(r.indexOf("ERR:") === 0 ? r.slice(4) : "Aucune réponse d'After Effects.", "err");
        var parts = r.slice(4).split("\u0001");
        if (!$("ex-name").value.trim()) $("ex-name").value = parts[0];
        $("ex-code").value = parts.slice(1).join("\u0001");
        api.status("Expression récupérée.", "ok");
      });
    };

    $("ex-save").onclick = function () {
      var name = $("ex-name").value.trim(), code = $("ex-code").value;
      if (!code.trim()) return api.status("Colle ou récupère une expression d'abord.", "err");
      if (!name) name = "Expression " + (mine.length + 1);
      if (editing >= 0) mine[editing] = { name: name, code: code };
      else mine.unshift({ name: name, code: code });
      save();
      closeEditor();
      renderMine();
      api.status("« " + name + " » enregistrée.", "ok");
    };

    /* ----- Import / export ----- */
    $("ex-export").onclick = function () {
      if (!mine.length) return api.status("Ta bibliothèque est vide.", "err");
      var data = JSON.stringify({ app: "Toolkit", type: "expressions", version: 1, items: mine }, null, 2);
      api.run("SZ.expr.exportFile", [data, "sur-core-expressions.json"]);
    };

    $("ex-import").onclick = function () {
      api.call("SZ.expr.importFile", []).then(function (r) {
        if (r.indexOf("TXT:") !== 0) {
          if (r.indexOf("annulé") < 0) api.status(r.indexOf("ERR:") === 0 ? r.slice(4) : "Aucune réponse d'After Effects.", "err");
          return;
        }
        var parts = r.slice(4).split("\u0001"), file = parts[0], txt = parts.slice(1).join("\u0001");
        var added = 0;
        try {
          var j = JSON.parse(txt), list = Array.isArray(j) ? j : (j.items || []);
          list.forEach(function (m) {
            if (!m || typeof m.code !== "string") return;
            var dup = mine.some(function (x) { return x.code === m.code; });
            if (!dup) { mine.push({ name: String(m.name || "Importée"), code: m.code }); added++; }
          });
        } catch (e) {
          // Fichier texte : une seule expression, nommée d'après le fichier
          if (txt.trim()) { mine.push({ name: file.replace(/\.[^.]+$/, ""), code: txt }); added = 1; }
        }
        save();
        renderMine();
        api.status(added ? added + " expression" + (added > 1 ? "s importées" : " importée") : "Rien de nouveau à importer.", added ? "ok" : "");
      });
    };

    renderMine();
  }
});
