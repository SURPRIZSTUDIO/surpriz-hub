/* Module Projet — renommer par lot, ranger et nettoyer le projet. */

var SZ = $.global.SZ = $.global.SZ || {};
SZ.project = {};

/* Cibles : calques sélectionnés dans la compo active, sinon éléments sélectionnés du panneau Projet. */
SZ.project._targets = function () {
    var out = [], i, comp = SZ.activeComp();
    if (comp && comp.selectedLayers.length) {
        var s = comp.selectedLayers;
        for (i = 0; i < s.length; i++) out.push(s[i]);
        out.sort(function (a, b) { return a.index - b.index; });
        return { list: out, kind: "calque" };
    }
    var sel = app.project.selection;
    for (i = 0; i < sel.length; i++) out.push(sel[i]);
    return { list: out, kind: "élément" };
};

SZ.project._pad = function (n, w) {
    var s = String(n);
    while (s.length < w) s = "0" + s;
    return s;
};

/**
 * mode "pattern" : a = modèle ({nom} = nom actuel, ### = numéro sur 3 chiffres), b = début, c = pas
 * mode "replace" : a = texte cherché, b = remplacement
 */
SZ.project.rename = function (mode, a, b, c) {
    return SZ.run("Toolkit : renommer", function () {
        var tg = SZ.project._targets(), L = tg.list;
        if (!L.length) return "ERR:Sélectionne des calques (ou des éléments du panneau Projet).";
        var n = 0, i;
        if (mode === "replace") {
            if (!a) return "ERR:Indique le texte à chercher.";
            for (i = 0; i < L.length; i++) {
                var nm = L[i].name;
                if (nm.indexOf(a) < 0) continue;
                L[i].name = nm.split(a).join(b || "");
                n++;
            }
            if (!n) return "ERR:« " + a + " » introuvable dans les noms sélectionnés.";
        } else {
            if (!a) return "ERR:Indique un modèle de nom.";
            var start = Number(b), step = Number(c);
            if (isNaN(start)) start = 1;
            if (isNaN(step) || !step) step = 1;
            for (i = 0; i < L.length; i++) {
                var num = start + i * step;
                var name = a.replace(/\{nom\}/gi, L[i].name).replace(/#+/g, function (h) { return SZ.project._pad(num, h.length); });
                L[i].name = name;
                n++;
            }
        }
        return "OK:" + n + " " + tg.kind + (n > 1 ? "s" : "") + " renommé" + (n > 1 ? "s" : "");
    });
};

SZ.project._folder = function (name) {
    var root = app.project.rootFolder;
    for (var i = 1; i <= root.numItems; i++) {
        var it = root.item(i);
        if (it instanceof FolderItem && it.name === name) return it;
    }
    return app.project.items.addFolder(name);
};

SZ.project._category = function (it) {
    if (it instanceof CompItem) return it.usedIn.length ? "02 Précomps" : "01 Compos";
    if (it instanceof FootageItem) {
        var src = it.mainSource;
        if (src instanceof SolidSource) return "06 Solides";
        if (src instanceof PlaceholderSource) return "07 Autres";
        if (!it.hasVideo && it.hasAudio) return "05 Audio";
        if (src.isStill) return "04 Images";
        if (it.hasVideo) return "03 Vidéos";
    }
    return "07 Autres";
};

/** Range les éléments posés à la racine du projet dans des dossiers par type. */
SZ.project.organize = function () {
    return SZ.run("Toolkit : ranger le projet", function () {
        var root = app.project.rootFolder, moves = [], i;
        for (i = 1; i <= root.numItems; i++) {
            var it = root.item(i);
            if (it instanceof FolderItem) continue;
            moves.push(it);
        }
        if (!moves.length) return "OK:Rien à ranger : la racine du projet est déjà propre.";
        var count = {};
        for (i = 0; i < moves.length; i++) {
            var cat = SZ.project._category(moves[i]);
            moves[i].parentFolder = SZ.project._folder(cat);
            count[cat] = (count[cat] || 0) + 1;
        }
        var parts = [];
        for (var k in count) parts.push(k.substr(3) + " : " + count[k]);
        return "OK:" + moves.length + " éléments rangés\n" + parts.join(" · ");
    });
};

SZ.project._removeEmptyFolders = function () {
    var removed = 0, again = true;
    while (again) {
        again = false;
        for (var i = app.project.numItems; i >= 1; i--) {
            var it = app.project.item(i);
            if (it instanceof FolderItem && it.numItems === 0) { it.remove(); removed++; again = true; }
        }
    }
    return removed;
};

/** Supprime les métrages inutilisés puis les dossiers vides. */
SZ.project.clean = function () {
    return SZ.run("Toolkit : nettoyer le projet", function () {
        var n = app.project.removeUnusedFootage() || 0;
        var f = SZ.project._removeEmptyFolders();
        return "OK:" + n + " métrage" + (n > 1 ? "s" : "") + " inutilisé" + (n > 1 ? "s" : "") + " supprimé" + (n > 1 ? "s" : "") +
            ", " + f + " dossier" + (f > 1 ? "s" : "") + " vide" + (f > 1 ? "s" : "");
    });
};

/** Fusionne les métrages importés en double. */
SZ.project.consolidate = function () {
    return SZ.run("Toolkit : consolider", function () {
        var n = app.project.consolidateFootage() || 0;
        return "OK:" + n + " doublon" + (n > 1 ? "s" : "") + " fusionné" + (n > 1 ? "s" : "");
    });
};

