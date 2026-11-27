/* Module Projet — interface. */
SZ.register({
  id: "project",
  name: "Projet",
  order: 7,
  embedIn: "formats",   // affiché en bas de l'onglet Compos

  mount: function (el, api) {
    var st = api.store.get("project.prefs", {});
    // Champ vide par défaut (l'exemple s'affiche en grisé) ; l'ancien modèle par défaut est retiré une fois.
    // Le nom tapé n'est pas mémorisé d'une session à l'autre : le champ repart vide, avec l'exemple grisé.
    // (gardé en mémoire tant que le panneau est ouvert, pour ne pas le perdre en changeant d'onglet)
    st.pattern = window.__szRenamePattern || "";
    if (st.start == null) st.start = 1;
    if (st.step == null) st.step = 1;

    el.insertAdjacentHTML("beforeend",
      '<div class="section-title mt">Ranger le projet</div>' +
      '<div class="form">' +
      '  <button class="btn tool" id="p-org"><b>' + SZIcon("folder") + '</b><span>Ranger par type<small>Compos, précomps, vidéos, images, audio, solides</small></span></button>' +
      '  <button class="btn tool" id="p-cons"><b>' + SZIcon("merge") + '</b><span>Fusionner les doublons<small>Métrages importés plusieurs fois</small></span></button>' +
      '  <button class="btn tool danger" id="p-clean"><b>' + SZIcon("trash") + '</b><span>Supprimer l\'inutilisé<small>Métrages non utilisés et dossiers vides</small></span></button>' +
      '</div>' +

      '<div class="section-title mt">Renommer</div>' +
      '<div class="form">' +
      '  <input class="input" id="p-pat" spellcheck="false" placeholder="ex. Titre_##">' +
      '  <div class="chips" id="p-tokens">' +
      '    <button data-t="{nom}" title="Insère le nom actuel de chaque élément">+ Nom actuel</button>' +
      '    <button data-t="#" title="Numéro sans zéro : 1, 2… 10">+ 1</button>' +
      '    <button data-t="##" title="Numéro sur 2 chiffres : 01, 02… 10">+ 01</button>' +
      '    <button data-t="###" title="Numéro sur 3 chiffres : 001, 002…">+ 001</button>' +
      '  </div>' +
      '  <p class="hint left" id="p-preview"></p>' +
      '  <details class="adv"><summary>Options avancées</summary>' +
      '    <div class="frow"><label style="width:auto">Commencer à</label><div class="num"><input class="input" id="p-start" type="number" title="Premier numéro attribué (1 → Titre_01, 5 → Titre_05)"></div>' +
      '      <label style="width:auto">Écart</label><div class="num"><input class="input" id="p-step" type="number" min="1" title="Écart entre deux numéros (1 → 01, 02, 03 · 10 → 10, 20, 30)"></div></div>' +
      '  </details>' +
      '  <button class="btn" id="p-rename">Renommer la sélection</button>' +
      '  <p class="hint left"><code>{nom}</code> = nom actuel · <code>##</code> = numéro (autant de chiffres que de #, ex. ### → 001).<br>' +
      '  Agit sur les calques sélectionnés, sinon sur les éléments sélectionnés du panneau Projet.</p>' +
      '</div>');

    var $ = function (id) { return el.querySelector("#" + id); };
    function save() { window.__szRenamePattern = st.pattern; var c = {}; for (var k in st) if (k !== "pattern") c[k] = st[k]; api.store.set("project.prefs", c); }

    $("p-org").onclick = function () { api.run("SZ.project.organize", []); };
    $("p-cons").onclick = function () { api.run("SZ.project.consolidate", []); };

    // Action destructive : deuxième clic pour confirmer
    var armed = null, clean = $("p-clean"), label = clean.innerHTML;
    function disarm() { clearTimeout(armed); armed = null; clean.innerHTML = label; clean.classList.remove("armed"); }
    clean.onclick = function () {
      if (armed) { disarm(); api.run("SZ.project.clean", []); return; }
      clean.innerHTML = "<b>" + SZIcon("alert") + "</b><span>Clique à nouveau pour confirmer<small>Annulable avec Ctrl/Cmd + Z</small></span>";
      clean.classList.add("armed");
      armed = setTimeout(disarm, 3000);
    };

    function pad(n, w) { var s = String(n); while (s.length < w) s = "0" + s; return s; }
    function preview() {
      var out = [];
      for (var i = 0; i < 3; i++) {
        var n = (+st.start || 0) + i * (+st.step || 1);
        out.push(st.pattern.replace(/\{nom\}/gi, "Calque").replace(/#+/g, function (h) { return pad(n, h.length); }));
      }
      $("p-preview").textContent = st.pattern ? "Aperçu : " + out.join(", ") + "…" : "";
    }

    [["p-pat", "pattern"], ["p-start", "start"], ["p-step", "step"]].forEach(function (f) {
      var inp = $(f[0]);
      inp.value = st[f[1]];
      inp.oninput = function () { st[f[1]] = inp.type === "number" ? +inp.value : inp.value; save(); preview(); };
      inp.onkeydown = function (e) { if (e.key === "Enter") $("p-rename").click(); };
    });

    // Boutons d'insertion : ajoutés à l'endroit du curseur (comme les jetons de l'Export)
    el.querySelectorAll("#p-tokens button").forEach(function (b) {
      b.onclick = function () {
        var inp = $("p-pat"), pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
        var before = inp.value.slice(0, pos), t = b.dataset.t;
        var sep = before && /#$/.test(before) === false && /[^\s_\-]$/.test(before) ? (t.charAt(0) === "#" ? "_" : " ") : "";
        inp.value = before + sep + t + inp.value.slice(pos);
        st.pattern = inp.value; save(); preview();
        inp.focus(); var c = (before + sep + t).length; inp.setSelectionRange(c, c);
      };
    });

    $("p-rename").onclick = function () {
      if (!st.pattern.trim()) { $("p-pat").focus(); return api.status("Écris un nom (ex. Titre_##) ou utilise les boutons + juste en dessous.", "err"); }
      api.run("SZ.project.rename", ["pattern", st.pattern, st.start, st.step]); };

    preview();
  }
});
