/* Jeu d'icônes Toolkit : une seule grille (24), un seul trait (2), extrémités arrondies.
   SZIcon("copy") → <svg>. Toute icône du panneau passe par ici : pas de caractères de police. */
(function () {
  var P = {
    // Clés
    copy:       '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    paste:      '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    reverse:    '<path d="M4 8h15"/><path d="m15 4 4 4-4 4"/><path d="M20 16H5"/><path d="m9 12-4 4 4 4"/>',
    mirror:     '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    alignStart: '<path d="M4 4v16"/><path d="M20 12H8"/><path d="m12 8-4 4 4 4"/>',
    alignEnd:   '<path d="M20 4v16"/><path d="M4 12h12"/><path d="m12 8 4 4-4 4"/>',
    playhead:   '<path d="M12 9v12"/><path d="M8 3h8v3l-4 3-4-3z"/>',
    flipValues: '<path d="M7 20V4"/><path d="m3 8 4-4 4 4"/><path d="M17 4v16"/><path d="m13 16 4 4 4-4"/>',
    snap:       '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/>',
    // Projet / fichiers
    folder:     '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    merge:      '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    trash:      '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/>',
    import:     '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    export:     '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
    refresh:    '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    // Génériques
    plus:       '<path d="M12 5v14"/><path d="M5 12h14"/>',
    close:      '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    minus:      '<path d="M5 12h14"/>',
    pencil:     '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
    star:       '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
    grip:       '<circle cx="9" cy="6" r=".6"/><circle cx="15" cy="6" r=".6"/><circle cx="9" cy="12" r=".6"/><circle cx="15" cy="12" r=".6"/><circle cx="9" cy="18" r=".6"/><circle cx="15" cy="18" r=".6"/>',
    chevron:    '<path d="m6 9 6 6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    info:       '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5h.01"/>',
    alert:      '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5"/><path d="M12 16.5h.01"/>',
    // Couleurs
    pipette:    '<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>',
    screenPick: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><circle cx="12" cy="10.5" r="2.5"/>',
    fromLayer:  '<path d="m15 3 7 4-7 4-7-4z"/><path d="m8 12 7 4 7-4"/><path d="M2 18h9"/><path d="m5 15-3 3 3 3"/>',
    // Courbes
    onion:      '<circle cx="5" cy="12" r="2" opacity=".35"/><circle cx="12" cy="12" r="2" opacity=".65"/><circle cx="19" cy="12" r="2"/>'
  };
  /* Suppression en deux temps, partout pareil : un trait « − » ; 1er clic → croix sur fond rouge ;
     2e clic (dans les 2,5 s) → supprime. SZDel.html() pour le contenu, SZDel.confirm(el) dans le clic :
     renvoie true seulement au 2e clic. */
  var armedTimer = null;
  window.SZDel = {
    html: function () { return window.SZIcon("minus"); },
    confirm: function (el) {
      if (el.classList.contains("del-armed")) { clearTimeout(armedTimer); return true; }
      document.querySelectorAll(".del-armed").forEach(function (x) { window.SZDel.disarm(x); });
      el.classList.add("del-armed");
      el.dataset.title = el.title || "";
      el.title = (window.SZI18N && SZI18N.lang === "en") ? "Click again to delete" : "Clique encore pour supprimer";
      el.innerHTML = window.SZIcon("close");
      clearTimeout(armedTimer);
      armedTimer = setTimeout(function () { window.SZDel.disarm(el); }, 2500);
      return false;
    },
    disarm: function (el) {
      if (!el.classList.contains("del-armed")) return;
      el.classList.remove("del-armed");
      el.title = el.dataset.title || "";
      el.innerHTML = window.SZIcon("minus");
    }
  };
  window.SZIcon = function (name, cls) {
    return '<svg class="sz-ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || "") + "</svg>";
  };
})();
