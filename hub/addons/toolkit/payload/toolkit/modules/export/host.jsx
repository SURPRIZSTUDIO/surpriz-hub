/* Module Export — rendu rapide des compos via la file de rendu, noms automatiques. */

var SZ = $.global.SZ = $.global.SZ || {};
SZ.exportx = {};

SZ.exportx._pad = function (n) { return n < 10 ? "0" + n : String(n); };

/* Remplace les jetons dans un modèle de nom. */
SZ.exportx._name = function (pattern, comp) {
    var d = new Date(), P = SZ.exportx._pad;
    var proj = app.project.file ? decodeURI(app.project.file.name).replace(/\.aep$/i, "") : "Projet";
    var map = {
        comp: comp.name,
        projet: proj,
        date: String(d.getFullYear()).substr(2) + P(d.getMonth() + 1) + P(d.getDate()),
        heure: P(d.getHours()) + "h" + P(d.getMinutes()),
        taille: comp.width + "x" + comp.height,
        fps: String(Math.round(comp.frameRate * 100) / 100)
    };
    map.project = map.projet; map.time = map.heure; map.size = map.taille; // jetons anglais
    var out = String(pattern || "[comp]").replace(/\[([a-z]+)\]/gi, function (all, k) {
        k = k.toLowerCase();
        return map.hasOwnProperty(k) ? map[k] : all;
    });
    // caractères interdits dans un nom de fichier
    return out.replace(/[\\\/:*?"<>|]/g, "-").replace(/^\s+|\s+$/g, "") || comp.name;
};

/* Dossier de sortie. mode : "project" (relatif au .aep) | "custom" | "ask" */
SZ.exportx._folder = function (mode, rel, custom) {
    var f;
    if (mode === "custom" && custom) f = new Folder(custom);
    else if (mode === "project") {
        if (!app.project.file) return { err: "Enregistre le projet d'abord (le dossier d'export est relatif au .aep)." };
        var base = app.project.file.parent.fsName;
        rel = String(rel || "./").replace(/\\/g, "/");
        f = new Folder(base + "/" + rel.replace(/^\.\//, ""));
    } else {
        f = Folder.selectDialog("Dossier d'export");
        if (!f) return { err: "Export annulé." };
    }
    if (!f.exists && !f.create()) return { err: "Impossible de créer le dossier " + f.fsName };
    return { folder: f };
};

/* Comps à rendre. source : "active" | "selection" */
SZ.exportx._comps = function (source) {
    var out = [], i;
    if (source === "selection") {
        var sel = app.project.selection;
        for (i = 0; i < sel.length; i++) if (sel[i] instanceof CompItem) out.push(sel[i]);
        if (!out.length) return { err: "Sélectionne une ou plusieurs compos dans le panneau Projet." };
    } else {
        var c = app.project.activeItem;
        if (!(c instanceof CompItem)) return { err: "Aucune composition active." };
        out.push(c);
    }
    return { comps: out };
};

/** Listes des modèles de module de sortie et de paramètres de rendu → "TPL:" + JSON maison */
SZ.exportx.templates = function () {
    var rq = app.project.renderQueue, tmp = null, comp = null, made = false;
    try {
        for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem) { comp = app.project.item(i); break; }
        if (!comp) { comp = app.project.items.addComp("__sz_tmp__", 100, 100, 1, 1, 25); made = true; }
        tmp = rq.items.add(comp);
        var om = tmp.outputModule(1).templates, rs = tmp.templates;
        var res = "TPL:" + om.join("\u0002") + "\u0001" + rs.join("\u0002");
        tmp.remove();
        if (made) comp.remove();
        return res;
    } catch (e) {
        try { if (tmp) tmp.remove(); if (made && comp) comp.remove(); } catch (e2) {}
        return "ERR:" + e.toString();
    }
};

/**
 * Rendu. o = { source, range, pattern, destMode, destRel, destCustom, om, rs, mode }
 * Renvoie "OUT:" + chemins séparés par \u0001 (mode "now"), ou "OK:…" (Media Encoder).
 */
SZ.exportx.render = function (json) {
    var o = eval("(" + json + ")");
    var C = SZ.exportx._comps(o.source);
    if (C.err) return "ERR:" + C.err;
    var F = SZ.exportx._folder(o.destMode, o.destRel, o.destCustom);
    if (F.err) return "ERR:" + F.err;

    var rq = app.project.renderQueue, i;
    if (o.mode === "ame" && !app.project.file) return "ERR:Enregistre le projet avant d'envoyer à Media Encoder.";
    if (rq.rendering) return "ERR:La file de rendu est déjà en cours.";

    // On met de côté les éléments déjà dans la file pour ne rendre que les nôtres.
    var paused = [];
    for (i = 1; i <= rq.numItems; i++) {
        var it = rq.item(i);
        if (it.status === RQItemStatus.QUEUED) { try { it.render = false; paused.push(it); } catch (e) {} }
    }

    var mine = [], files = [], warn = [];
    try {
        for (i = 0; i < C.comps.length; i++) {
            var comp = C.comps[i];
            var item = rq.items.add(comp);
            if (o.rs) { try { item.applyTemplate(o.rs); } catch (e1) { warn.push("Paramètres de rendu « " + o.rs + " » introuvables"); } }
            if (o.range === "work") {
                try { item.timeSpanStart = comp.workAreaStart; item.timeSpanDuration = comp.workAreaDuration; } catch (e2) {}
            } else {
                try { item.timeSpanStart = 0; item.timeSpanDuration = comp.duration; } catch (e3) {}
            }
            var om = item.outputModule(1);
            if (o.om) { try { om.applyTemplate(o.om); } catch (e4) { warn.push("Module de sortie « " + o.om + " » introuvable"); } }

            // Extension imposée par le module de sortie
            var ext = "";
            try { var m = decodeURI(om.file.name).match(/(\.[a-z0-9]+)$/i); if (m) ext = m[1]; } catch (e5) {}
            var base = SZ.exportx._name(o.pattern, comp), name = base, n = 2;
            while (new File(F.folder.fsName + "/" + name + ext).exists) {
                name = base + "_" + (n < 10 ? "0" + n : n); n++;
            }
            om.file = new File(F.folder.fsName + "/" + name + ext);
            mine.push(item);
            files.push(om.file.fsName);
        }

        if (o.mode === "ame") {
            app.project.save();
            rq.queueInAME(true);
            for (i = 0; i < mine.length; i++) { try { mine[i].remove(); } catch (e6) {} }
            return "OK:" + mine.length + " compo" + (mine.length > 1 ? "s envoyées" : " envoyée") + " à Media Encoder" +
                (warn.length ? "\n" + warn.join("\n") : "");
        }

        rq.render();

        var out = [];
        for (i = 0; i < mine.length; i++) {
            // Le module de sortie peut avoir ajusté le nom : on relit le chemin final.
            var path = files[i];
            try { path = mine[i].outputModule(1).file.fsName; } catch (e7) {}
            if (new File(path).exists) out.push(path);
            try { if (mine[i].status === RQItemStatus.DONE) mine[i].remove(); } catch (e8) {}
        }
        if (!out.length) return "ERR:Le rendu n'a produit aucun fichier." + (warn.length ? "\n" + warn.join("\n") : "");
        return "OUT:" + out.join("\u0001") + (warn.length ? "\u0003" + warn.join("\n") : "");
    } catch (err) {
        for (i = 0; i < mine.length; i++) { try { mine[i].remove(); } catch (e9) {} }
        return "ERR:" + err.toString();
    } finally {
        for (i = 0; i < paused.length; i++) { try { paused[i].render = true; } catch (e10) {} }
    }
};

/** Aperçu du nom pour la compo active (ou la première sélectionnée). */
SZ.exportx.preview = function (pattern, source) {
    var C = SZ.exportx._comps(source);
    if (C.err) return "ERR:" + C.err;
    return "NAME:" + SZ.exportx._name(pattern, C.comps[0]) + (C.comps.length > 1 ? "  (+" + (C.comps.length - 1) + ")" : "");
};

/** Choisir un dossier. */
SZ.exportx.pickFolder = function () {
    var f = Folder.selectDialog("Dossier d'export");
    return f ? "DIR:" + f.fsName : "ERR:Annulé.";
};

/** Choisir des fichiers (vidéo / GIF) à compresser. */
SZ.exportx.pickFiles = function () {
    var fs = File.openDialog("Fichiers à compresser", "*.mov;*.mp4;*.avi;*.mxf;*.gif;*.webm;*.mkv", true);
    if (!fs || !fs.length) return "ERR:Annulé.";
    var out = [];
    for (var i = 0; i < fs.length; i++) out.push(fs[i].fsName);
    return "FILES:" + out.join("\u0001");
};

/** Choisir l'exécutable ffmpeg. */
SZ.exportx.pickFfmpeg = function () {
    var f = File.openDialog("Localiser ffmpeg");
    return f ? "FILE:" + f.fsName : "ERR:Annulé.";
};

/** Ouvre le dossier d'export dans le Finder / l'Explorateur. */
SZ.exportx.openFolder = function (destMode, destRel, destCustom, filePath) {
    var f = filePath ? new File(filePath).parent : null;
    if (!f) {
        if (destMode === "custom" && destCustom) f = new Folder(destCustom);
        else if (destMode === "project" && app.project.file) f = new Folder(app.project.file.parent.fsName + "/" + String(destRel || "").replace(/^\.\//, ""));
    }
    if (!f || !f.exists) return "ERR:Dossier introuvable (rien n'a encore été exporté ?).";
    f.execute();
    return "OK:";
};
