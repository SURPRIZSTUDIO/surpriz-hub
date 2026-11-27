/* Module Formats — créer des compos à partir de formats, décliner la compo active. */

var SZ = $.global.SZ = $.global.SZ || {};
SZ.formats = {};

SZ.formats._rgb = function (hex) {
    hex = String(hex || "000000").replace(/[^0-9a-f]/gi, "");
    return [parseInt(hex.substr(0, 2), 16) / 255, parseInt(hex.substr(2, 2), 16) / 255, parseInt(hex.substr(4, 2), 16) / 255];
};

/* Nom unique dans le projet. */
SZ.formats._unique = function (name) {
    var names = {}, i;
    for (i = 1; i <= app.project.numItems; i++) names[app.project.item(i).name] = 1;
    if (!names[name]) return name;
    for (i = 2; i < 999; i++) if (!names[name + " " + i]) return name + " " + i;
    return name;
};

SZ.formats._even = function (n) { n = Math.round(n); return Math.max(4, Math.min(30000, n)); };

/**
 * Crée une compo par format. o = { formats:[{name,w,h}], fps, duration, bg, base }
 */
SZ.formats.create = function (json) {
    var o = eval("(" + json + ")");
    return SZ.run("Toolkit : nouvelle compo", function () {
        if (!o.formats || !o.formats.length) return "ERR:Choisis au moins un format.";
        var made = [], fps = +o.fps || 25, dur = Math.max(1 / fps, +o.duration || 10);
        for (var i = 0; i < o.formats.length; i++) {
            var f = o.formats[i];
            var name = SZ.formats._unique((o.base ? o.base + " – " : "") + f.name);
            var c = app.project.items.addComp(name, SZ.formats._even(f.w), SZ.formats._even(f.h), 1, dur, fps);
            c.bgColor = SZ.formats._rgb(o.bg);
            made.push(c);
        }
        made[made.length - 1].openInViewer();
        return "OK:" + made.length + " compo" + (made.length > 1 ? "s créées" : " créée") +
            (made.length === 1 ? " : " + made[0].name + " (" + made[0].width + "×" + made[0].height + ")" : "");
    });
};

/**
 * Décline la compo active dans d'autres formats : chaque nouvelle compo contient
 * la compo d'origine, mise à l'échelle. fit : "contain" (tout voir) | "cover" (remplir)
 */
SZ.formats.adapt = function (json) {
    var o = eval("(" + json + ")");
    return SZ.run("Toolkit : décliner la compo", function () {
        var src = app.project.activeItem;
        if (!(src instanceof CompItem)) return "ERR:Ouvre la compo à décliner.";
        if (!o.formats || !o.formats.length) return "ERR:Choisis au moins un format.";
        var made = [];
        for (var i = 0; i < o.formats.length; i++) {
            var f = o.formats[i];
            var w = SZ.formats._even(f.w), h = SZ.formats._even(f.h);
            var c = app.project.items.addComp(SZ.formats._unique(src.name + " – " + f.name), w, h,
                src.pixelAspect, src.duration, src.frameRate);
            c.bgColor = src.bgColor;
            c.workAreaStart = src.workAreaStart;
            c.workAreaDuration = src.workAreaDuration;
            try { c.parentFolder = src.parentFolder; } catch (e) {}
            var L = c.layers.add(src);
            var sx = w / src.width, sy = h / src.height;
            var s = (o.fit === "cover" ? Math.max(sx, sy) : Math.min(sx, sy)) * 100;
            L.property("ADBE Transform Group").property("ADBE Scale").setValue([s, s]);
            L.property("ADBE Transform Group").property("ADBE Position").setValue([w / 2, h / 2]);
            if (o.collapse) { try { L.collapseTransformation = true; } catch (e2) {} }
            made.push(c);
        }
        made[made.length - 1].openInViewer();
        return "OK:« " + src.name + " » déclinée en " + made.length + " format" + (made.length > 1 ? "s" : "");
    });
};

/** Taille de la compo active → "SIZE:w,h,fps" (pour enregistrer un format perso). */
SZ.formats.activeSize = function () {
    var c = app.project.activeItem;
    if (!(c instanceof CompItem)) return "ERR:Aucune composition active.";
    return "SIZE:" + c.width + "," + c.height + "," + c.frameRate + "," + c.name;
};

/* ---------- Dupliquer en profondeur ---------- */

/**
 * Duplique une compo et toutes ses précompos (à tous les niveaux).
 * o = { source:"active"|"selection", from, to, suffix, keep:"mot, mot", folder:bool }
 */
SZ.formats.deepDuplicate = function (json) {
    var o = eval("(" + json + ")");
    return SZ.run("Toolkit : dupliquer en profondeur", function () {
        var roots = [], i;
        if (o.source === "selection") {
            var sel = app.project.selection;
            for (i = 0; i < sel.length; i++) if (sel[i] instanceof CompItem) roots.push(sel[i]);
            if (!roots.length) return "ERR:Sélectionne une ou plusieurs compos dans le panneau Projet.";
        } else {
            var c = app.project.activeItem;
            if (!(c instanceof CompItem)) return "ERR:Aucune composition active.";
            roots.push(c);
        }

        var keep = [];
        String(o.keep || "").replace(/[^,;]+/g, function (w) { w = w.replace(/^\s+|\s+$/g, ""); if (w) keep.push(w.toLowerCase()); return w; });
        var from = String(o.from || ""), to = String(o.to || ""), suffix = String(o.suffix || "");
        if (!from && !suffix) suffix = "_copie";

        function newName(n) {
            var out = (from && n.indexOf(from) >= 0) ? n.split(from).join(to) : n + suffix;
            if (out === n) out = n + (suffix || "_copie");
            return SZ.formats._unique(out);
        }
        function kept(comp) {
            var n = comp.name.toLowerCase();
            for (var k = 0; k < keep.length; k++) if (n.indexOf(keep[k]) >= 0) return true;
            return false;
        }

        var map = {}, pairs = [], made = [], owner = [], shared = 0, cur = 0;

        function dup(comp, isRoot) {
            if (map[comp.id]) return map[comp.id];
            if (!isRoot && kept(comp)) { shared++; return comp; }
            var oldName = comp.name;
            var nc = comp.duplicate();
            nc.name = newName(oldName);
            map[comp.id] = nc;
            pairs.push([oldName, nc.name]);
            made.push(nc);
            owner.push(isRoot ? -1 : cur);
            for (var l = 1; l <= nc.numLayers; l++) {
                var L = nc.layer(l);
                if (L.source instanceof CompItem) {
                    var ns = dup(L.source, false);
                    if (ns !== L.source) L.replaceSource(ns, false);
                }
            }
            return nc;
        }

        var newRoots = [];
        for (i = 0; i < roots.length; i++) { cur = i; newRoots.push(dup(roots[i], true)); }

        // Rangement : un dossier par compo dupliquée, ses précompos dans un sous-dossier
        if (o.folder) {
            var subs = [];
            for (i = 0; i < newRoots.length; i++) {
                var F = app.project.items.addFolder(newRoots[i].name);
                try { F.parentFolder = roots[i].parentFolder; } catch (e) {}
                newRoots[i].parentFolder = F;
                subs.push({ folder: F, sub: null });
            }
            for (var m = 0; m < made.length; m++) {
                if (owner[m] < 0) continue;
                var S = subs[owner[m]];
                if (!S.sub) { S.sub = app.project.items.addFolder("Précomps"); S.sub.parentFolder = S.folder; }
                made[m].parentFolder = S.sub;
            }
        }

        // Expressions : comp("Ancien nom") → comp("Nouveau nom") dans les copies
        var fixed = 0;
        if (pairs.length) {
            for (i = 0; i < made.length; i++) {
                for (var li = 1; li <= made[i].numLayers; li++) {
                    SZ.formats._fixExpr(made[i].layer(li), pairs, function () { fixed++; });
                }
            }
        }

        if (newRoots.length) newRoots[newRoots.length - 1].openInViewer();
        var msg = "OK:" + made.length + " compo" + (made.length > 1 ? "s dupliquées" : " dupliquée");
        if (shared) msg += " · " + shared + " précompo" + (shared > 1 ? "s" : "") + " laissée" + (shared > 1 ? "s" : "") + " partagée" + (shared > 1 ? "s" : "");
        if (fixed) msg += "\n" + fixed + " expression" + (fixed > 1 ? "s" : "") + " mise" + (fixed > 1 ? "s" : "") + " à jour";
        return msg;
    });
};

SZ.formats._fixExpr = function (group, pairs, onFix) {
    var n = 0;
    try { n = group.numProperties; } catch (e) { return; }
    for (var i = 1; i <= n; i++) {
        var p;
        try { p = group.property(i); } catch (e2) { continue; }
        if (!p) continue;
        if (p.propertyType === PropertyType.PROPERTY) {
            try {
                if (!p.canSetExpression || !p.expression || p.expression.indexOf("comp(") < 0) continue;
                var ex = p.expression, orig = ex;
                for (var k = 0; k < pairs.length; k++) {
                    var a = pairs[k][0].replace(/\\/g, "\\\\").replace(/"/g, '\\"'), b = pairs[k][1].replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                    ex = ex.split('comp("' + a + '")').join('comp("' + b + '")');
                    ex = ex.split("comp('" + pairs[k][0] + "')").join("comp('" + pairs[k][1] + "')");
                }
                if (ex !== orig) { p.expression = ex; onFix(); }
            } catch (e3) {}
        } else SZ.formats._fixExpr(p, pairs, onFix);
    }
};

/* ---------- Marges de sécurité réseaux sociaux ---------- */

/* Zones masquées par l'interface, en fractions de la largeur / hauteur.
   Sources : recommandations Meta (Reels / Stories) et TikTok, 2025. */
SZ.formats.SAFE = {
    reels:   { label: "Reels",   zones: [[0, 0, 1, 0.14], [0, 0.65, 1, 0.35], [0, 0, 0.06, 1], [0.94, 0, 0.06, 1], [0.79, 0.4, 0.21, 0.6]] },
    stories: { label: "Stories", zones: [[0, 0, 1, 0.14], [0, 0.8, 1, 0.2], [0, 0, 0.06, 1], [0.94, 0, 0.06, 1]] },
    tiktok:  { label: "TikTok",  zones: [[0, 0, 1, 0.1], [0, 0.8, 1, 0.2], [0.86, 0.4, 0.14, 0.6], [0, 0, 0.04, 1]] },
    grid:    { label: "Grille profil 3:4", grid: true }
};

SZ.formats._removeSafe = function (comp) {
    var found = "";
    for (var i = comp.numLayers; i >= 1; i--) {
        var L = comp.layer(i);
        for (var k in SZ.formats.SAFE) {
            if (L.name === "Guide · " + SZ.formats.SAFE[k].label) { found = k; L.locked = false; L.remove(); break; }
        }
    }
    return found;
};

/* Guide actuellement posé dans la compo active → "SAFE:reels", "SAFE:" si aucun. */
SZ.formats.safeZoneState = function () {
    var comp = SZ.activeComp();
    if (!comp) return "SAFE:";
    for (var i = 1; i <= comp.numLayers; i++) {
        for (var k in SZ.formats.SAFE) if (comp.layer(i).name === "Guide · " + SZ.formats.SAFE[k].label) return "SAFE:" + k;
    }
    return "SAFE:";
};

SZ.formats._rectGroup = function (contents, name, x, y, w, h, comp, rgb, opacity, strokeW) {
    var g = contents.addProperty("ADBE Vector Group");
    g.name = name;
    var v = g.property("ADBE Vectors Group");
    var r = v.addProperty("ADBE Vector Shape - Rect");
    r.property("ADBE Vector Rect Size").setValue([w, h]);
    r.property("ADBE Vector Rect Position").setValue([x + w / 2 - comp.width / 2, y + h / 2 - comp.height / 2]);
    if (strokeW) {
        var s = v.addProperty("ADBE Vector Graphic - Stroke");
        s.property("ADBE Vector Stroke Color").setValue(rgb);
        s.property("ADBE Vector Stroke Width").setValue(strokeW);
        s.property("ADBE Vector Stroke Opacity").setValue(opacity);
    } else {
        var f = v.addProperty("ADBE Vector Graphic - Fill");
        f.property("ADBE Vector Fill Color").setValue(rgb);
        f.property("ADBE Vector Fill Opacity").setValue(opacity);
    }
};

/** Ajoute (ou retire s'il existe déjà) un calque guide de marges de sécurité. */
SZ.formats.safeZone = function (id) {
    return SZ.run("Toolkit : marges de sécurité", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var Z = SZ.formats.SAFE[id];
        if (!Z) return "ERR:Guide inconnu.";
        var name = "Guide · " + Z.label;
        // Un seul guide à la fois : on retire celui déjà posé ; recliquer sur le même le retire simplement.
        var had = SZ.formats._removeSafe(comp);
        if (had === id) return "OK:Guide « " + Z.label + " » retiré";
        var W = comp.width, H = comp.height;
        var L = comp.layers.addShape();
        L.name = name;
        L.guideLayer = true;
        L.label = 1;
        var c = L.property("ADBE Root Vectors Group"), red = [1, 0.18, 0.18], lime = [0.87, 1, 0.07];
        if (Z.grid) {
            // Zone visible dans la grille du profil Instagram (3:4, centrée)
            var gh = Math.min(H, W * 4 / 3), gw = Math.min(W, H * 3 / 4);
            if (gh < H) { SZ.formats._rectGroup(c, "Coupé (haut)", 0, 0, W, (H - gh) / 2, comp, red, 28); SZ.formats._rectGroup(c, "Coupé (bas)", 0, (H + gh) / 2, W, (H - gh) / 2, comp, red, 28); }
            if (gw < W) { SZ.formats._rectGroup(c, "Coupé (gauche)", 0, 0, (W - gw) / 2, H, comp, red, 28); SZ.formats._rectGroup(c, "Coupé (droite)", (W + gw) / 2, 0, (W - gw) / 2, H, comp, red, 28); }
            SZ.formats._rectGroup(c, "Visible dans la grille", (W - gw) / 2, (H - gh) / 2, gw, gh, comp, lime, 90, Math.max(2, W / 400));
        } else {
            for (var z = 0; z < Z.zones.length; z++) {
                var q = Z.zones[z];
                SZ.formats._rectGroup(c, "Masqué par l'interface " + (z + 1), q[0] * W, q[1] * H, q[2] * W, q[3] * H, comp, red, 28);
            }
        }
        L.moveToBeginning();
        L.locked = true;
        var warn = "";
        if (!Z.grid && Math.abs(W / H - 9 / 16) > 0.02) warn = "\nAttention : ce guide est prévu pour du 9:16.";
        return "OK:Guide « " + Z.label + " » ajouté (calque guide, non rendu)" + warn;
    });
};
