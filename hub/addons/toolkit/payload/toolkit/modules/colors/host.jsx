/* Module Couleurs — lire les couleurs du projet, appliquer une couleur à la sélection. */

var SZ = $.global.SZ = $.global.SZ || {};
SZ.colors = {};

SZ.colors._hex = function (c) {
    var h = "";
    for (var i = 0; i < 3; i++) {
        var v = Math.round(Math.min(1, Math.max(0, c[i])) * 255).toString(16);
        h += v.length < 2 ? "0" + v : v;
    }
    return h.toUpperCase();
};
SZ.colors._rgb = function (hex) {
    return [parseInt(hex.substr(0, 2), 16) / 255, parseInt(hex.substr(2, 2), 16) / 255, parseInt(hex.substr(4, 2), 16) / 255];
};

/* Parcourt toutes les propriétés d'un groupe ; cb(prop) pour chaque propriété finale. */
SZ.colors._walk = function (group, cb, depth) {
    if (depth > 12) return;
    var n = 0;
    try { n = group.numProperties; } catch (e) { return; }
    for (var i = 1; i <= n; i++) {
        var p;
        try { p = group.property(i); } catch (e2) { continue; }
        if (!p) continue;
        if (p.propertyType === PropertyType.PROPERTY) cb(p);
        else SZ.colors._walk(p, cb, depth + 1);
    }
};

/* Couleurs d'une propriété : couleur simple, ou couleurs d'un texte. */
SZ.colors._read = function (p, t, add) {
    try {
        if (p.propertyValueType === PropertyValueType.COLOR) {
            if (p.numKeys > 0) { for (var k = 1; k <= p.numKeys; k++) add(p.keyValue(k)); }
            else add(p.valueAtTime(t, false));
        } else if (p.propertyValueType === PropertyValueType.TEXT_DOCUMENT) {
            var td = p.valueAtTime(t, false);
            if (td.applyFill) add(td.fillColor);
            if (td.applyStroke) add(td.strokeColor);
        }
    } catch (e) {}
};

/** Inventaire des couleurs : scope "comp" (compo active) ou "project". Renvoie "COL:HEX,HEX,…" par fréquence. */
SZ.colors.scan = function (scope) {
    var count = {}, order = [];
    function add(c) {
        if (!c || c.length < 3) return;
        var h = SZ.colors._hex(c);
        if (!count[h]) { count[h] = 0; order.push(h); }
        count[h]++;
    }
    var comps = [], i;
    if (scope === "project") {
        for (i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem) comps.push(it);
            else if (it instanceof FootageItem && it.mainSource instanceof SolidSource) add(it.mainSource.color);
        }
    } else {
        var c = SZ.activeComp();
        if (!c) return "ERR:Aucune composition active.";
        comps.push(c);
    }
    for (var ci = 0; ci < comps.length; ci++) {
        var comp = comps[ci];
        for (var li = 1; li <= comp.numLayers; li++) {
            var L = comp.layer(li);
            try { if (L.source && L.source.mainSource instanceof SolidSource) add(L.source.mainSource.color); } catch (e) {}
            SZ.colors._walk(L, function (p) { SZ.colors._read(p, comp.time, add); }, 0);
            if (order.length > 400) break;
        }
    }
    order.sort(function (a, b) { return count[b] - count[a]; });
    return "COL:" + order.slice(0, 80).join(",");
};

/* Cibles couleur de la sélection selon le mode "fill" ou "stroke". */
SZ.colors._targets = function (comp, mode) {
    var out = [], layers = comp.selectedLayers, i, j;
    var fillMN = "ADBE Vector Graphic - Fill", strokeMN = "ADBE Vector Graphic - Stroke";
    var want = mode === "stroke" ? strokeMN : fillMN;

    // 1) Propriétés couleur (ou groupes) sélectionnées explicitement
    for (i = 0; i < layers.length; i++) {
        var sp = layers[i].selectedProperties;
        for (j = 0; j < sp.length; j++) {
            var p = sp[j];
            if (p.propertyType === PropertyType.PROPERTY) {
                if (p.propertyValueType === PropertyValueType.COLOR) out.push({ prop: p });
            } else if (p.matchName === fillMN || p.matchName === strokeMN) {
                SZ.colors._walk(p, function (q) { if (q.propertyValueType === PropertyValueType.COLOR) out.push({ prop: q }); }, 0);
            }
        }
    }
    if (out.length) return out;

    // 2) Sinon, les calques entiers
    for (i = 0; i < layers.length; i++) {
        var L = layers[i];
        if (L.matchName === "ADBE Vector Layer") {
            SZ.colors._walk(L.property("ADBE Root Vectors Group"), function (q) {
                var par = q.parentProperty;
                if (par && par.matchName === want && q.propertyValueType === PropertyValueType.COLOR) out.push({ prop: q });
            }, 0);
        } else if (L.matchName === "ADBE Text Layer") {
            out.push({ text: L.property("ADBE Text Properties").property("ADBE Text Document"), mode: mode });
        } else {
            try { if (L.source && L.source.mainSource instanceof SolidSource && mode !== "stroke") out.push({ solid: L.source.mainSource }); } catch (e) {}
        }
    }
    return out;
};

SZ.colors._set = function (p, val, t) {
    if (p.numKeys > 0) p.setValueAtTime(t, val); else p.setValue(val);
};

/** Applique une couleur HEX à la sélection. mode : "fill" | "stroke" */
SZ.colors.apply = function (hex, mode, width) {
    return SZ.run("Toolkit : couleur", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        if (!comp.selectedLayers.length) return "ERR:Sélectionne un calque ou une propriété couleur.";
        var rgb = SZ.colors._rgb(hex), t = comp.time;
        var targets = SZ.colors._targets(comp, mode), n = 0;
        for (var i = 0; i < targets.length; i++) {
            var tg = targets[i];
            try {
                if (tg.prop) { SZ.colors._set(tg.prop, [rgb[0], rgb[1], rgb[2], 1], t); n++; }
                else if (tg.text) {
                    var td = tg.text.valueAtTime(t, false);
                    if (tg.mode === "stroke") { td.applyStroke = true; td.strokeColor = rgb; }
                    else { td.applyFill = true; td.fillColor = rgb; }
                    SZ.colors._set(tg.text, td, t); n++;
                }
                else if (tg.solid) { tg.solid.color = rgb; n++; }
            } catch (e) {}
        }
        if (!n && mode === "stroke") return SZ.colors._addStroke(hex, width || 4);
        if (!n) return "ERR:Aucune couleur de remplissage trouvée dans la sélection.";
        return "OK:#" + hex + " appliqué (" + n + " cible" + (n > 1 ? "s" : "") + ")";
    });
};

/** Pipette : couleur de la sélection → "COL:HEX" */
SZ.colors.pick = function (mode) {
    var comp = SZ.activeComp();
    if (!comp) return "ERR:Aucune composition active.";
    var targets = SZ.colors._targets(comp, mode), t = comp.time;
    for (var i = 0; i < targets.length; i++) {
        var tg = targets[i];
        try {
            if (tg.prop) return "COL:" + SZ.colors._hex(tg.prop.valueAtTime(t, false));
            if (tg.text) { var td = tg.text.valueAtTime(t, false); return "COL:" + SZ.colors._hex(mode === "stroke" ? td.strokeColor : td.fillColor); }
            if (tg.solid) return "COL:" + SZ.colors._hex(tg.solid.color);
        } catch (e) {}
    }
    return "ERR:Aucune couleur trouvée dans la sélection.";
};

/* ---------- Outils de contour ---------- */

/* Groupes « Contenu » où agir pour un calque de forme : chaque groupe de premier niveau,
   ou la racine s'il n'y a pas de groupe. */
SZ.colors._contents = function (L) {
    var root = L.property("ADBE Root Vectors Group"), out = [];
    for (var i = 1; i <= root.numProperties; i++) {
        var g = root.property(i);
        if (g.matchName === "ADBE Vector Group") out.push(g.property("ADBE Vectors Group"));
    }
    if (!out.length) out.push(root);
    return out;
};

SZ.colors._find = function (contents, mn) {
    var out = [];
    for (var i = 1; i <= contents.numProperties; i++) if (contents.property(i).matchName === mn) out.push(contents.property(i));
    return out;
};

SZ.colors._selLayers = function () {
    var comp = SZ.activeComp();
    if (!comp) return { err: "ERR:Aucune composition active." };
    var s = comp.selectedLayers, out = [];
    for (var i = 0; i < s.length; i++) if (!s[i].locked) out.push(s[i]);
    if (!out.length) return { err: "ERR:Sélectionne un calque de forme ou de texte." };
    return { comp: comp, layers: out };
};

/** Ajoute un contour (ou met à jour l'existant) : couleur HEX + épaisseur. */
SZ.colors.addStroke = function (hex, width) {
    return SZ.run("Toolkit : contour", function () { return SZ.colors._addStroke(hex, width); });
};
SZ.colors._addStroke = function (hex, width) {
    {
        var S = SZ.colors._selLayers();
        if (S.err) return S.err;
        var rgb = SZ.colors._rgb(hex), n = 0, skip = [];
        for (var i = 0; i < S.layers.length; i++) {
            var L = S.layers[i];
            if (L.matchName === "ADBE Vector Layer") {
                var cs = SZ.colors._contents(L);
                for (var c = 0; c < cs.length; c++) {
                    var st = SZ.colors._find(cs[c], "ADBE Vector Graphic - Stroke");
                    if (!st.length) {
                        var ns = cs[c].addProperty("ADBE Vector Graphic - Stroke");
                        // placé avant le remplissage pour être dessiné par-dessus
                        var fills = SZ.colors._find(cs[c], "ADBE Vector Graphic - Fill");
                        if (fills.length) { try { ns.moveTo(fills[0].propertyIndex); } catch (e) {} }
                        st = SZ.colors._find(cs[c], "ADBE Vector Graphic - Stroke");
                    }
                    for (var k = 0; k < st.length; k++) {
                        st[k].enabled = true;
                        SZ.colors._set(st[k].property("ADBE Vector Stroke Color"), [rgb[0], rgb[1], rgb[2], 1], S.comp.time);
                        SZ.colors._set(st[k].property("ADBE Vector Stroke Width"), width, S.comp.time);
                        n++;
                    }
                }
            } else if (L.matchName === "ADBE Text Layer") {
                var tp = L.property("ADBE Text Properties").property("ADBE Text Document");
                var td = tp.valueAtTime(S.comp.time, false);
                td.applyStroke = true; td.strokeColor = rgb; td.strokeWidth = width;
                try { td.strokeOverFill = true; } catch (e2) {}
                SZ.colors._set(tp, td, S.comp.time);
                n++;
            } else skip.push(L.name);
        }
        if (!n) return "ERR:Le contour s'ajoute aux calques de forme et de texte.";
        var msg = "OK:Contour #" + hex + " · " + width + " px (" + n + ")";
        if (skip.length) msg += "\nIgnoré (ni forme ni texte) : " + skip.join(", ");
        return msg;
    }
};

/** Retire les contours des calques sélectionnés. */
SZ.colors.removeStroke = function () {
    return SZ.run("Toolkit : retirer le contour", function () {
        var S = SZ.colors._selLayers();
        if (S.err) return S.err;
        var n = 0;
        for (var i = 0; i < S.layers.length; i++) {
            var L = S.layers[i];
            if (L.matchName === "ADBE Vector Layer") {
                var list = [];
                (function collect(g) {
                    for (var j = 1; j <= g.numProperties; j++) {
                        var p = g.property(j);
                        if (p.matchName === "ADBE Vector Graphic - Stroke") list.push(p);
                        else if (p.matchName === "ADBE Vector Group") collect(p.property("ADBE Vectors Group"));
                    }
                })(L.property("ADBE Root Vectors Group"));
                for (var k = list.length - 1; k >= 0; k--) { list[k].remove(); n++; }
            } else if (L.matchName === "ADBE Text Layer") {
                var tp = L.property("ADBE Text Properties").property("ADBE Text Document");
                var td = tp.valueAtTime(S.comp.time, false);
                if (td.applyStroke) { td.applyStroke = false; SZ.colors._set(tp, td, S.comp.time); n++; }
            }
        }
        return n ? "OK:" + n + " contour" + (n > 1 ? "s retirés" : " retiré") : "ERR:Aucun contour dans la sélection.";
    });
};

/** Arrondit les coins des calques de forme (ajoute ou règle « Arrondir les angles »). */
SZ.colors.roundCorners = function (radius) {
    return SZ.run("Toolkit : arrondir les coins", function () {
        var S = SZ.colors._selLayers();
        if (S.err) return S.err;
        var n = 0;
        for (var i = 0; i < S.layers.length; i++) {
            var L = S.layers[i];
            if (L.matchName !== "ADBE Vector Layer") continue;
            var cs = SZ.colors._contents(L);
            for (var c = 0; c < cs.length; c++) {
                var rc = SZ.colors._find(cs[c], "ADBE Vector Filter - RC");
                if (!rc.length) {
                    var r = cs[c].addProperty("ADBE Vector Filter - RC");
                    // juste après les tracés, avant remplissage / contour
                    var first = 0;
                    for (var j = 1; j <= cs[c].numProperties; j++) {
                        var mn = cs[c].property(j).matchName;
                        if (mn === "ADBE Vector Graphic - Fill" || mn === "ADBE Vector Graphic - Stroke") { first = j; break; }
                    }
                    if (first) { try { r.moveTo(first); } catch (e) {} }
                    rc = SZ.colors._find(cs[c], "ADBE Vector Filter - RC");
                }
                for (var k = 0; k < rc.length; k++) {
                    if (radius <= 0) rc[k].remove();
                    else SZ.colors._set(rc[k].property("ADBE Vector RoundCorner Radius"), radius, S.comp.time);
                    n++;
                }
            }
        }
        if (!n) return "ERR:L'arrondi s'applique aux calques de forme.";
        return radius <= 0 ? "OK:Arrondi retiré" : "OK:Coins arrondis à " + radius + " px";
    });
};

/** Style des extrémités et des angles du contour. cap : 1 bout / 2 rond / 3 carré ; join : 1 angle / 2 rond / 3 biseau */
SZ.colors.strokeStyle = function (cap, join) {
    return SZ.run("Toolkit : style de contour", function () {
        var S = SZ.colors._selLayers();
        if (S.err) return S.err;
        var n = 0;
        for (var i = 0; i < S.layers.length; i++) {
            var L = S.layers[i];
            if (L.matchName !== "ADBE Vector Layer") continue;
            (function walk(g) {
                for (var j = 1; j <= g.numProperties; j++) {
                    var p = g.property(j);
                    if (p.matchName === "ADBE Vector Graphic - Stroke") {
                        try { p.property("ADBE Vector Stroke Line Cap").setValue(cap); p.property("ADBE Vector Stroke Line Join").setValue(join); n++; } catch (e) {}
                    } else if (p.matchName === "ADBE Vector Group") walk(p.property("ADBE Vectors Group"));
                }
            })(L.property("ADBE Root Vectors Group"));
        }
        return n ? "OK:Style appliqué à " + n + " contour" + (n > 1 ? "s" : "") : "ERR:Aucun contour de forme dans la sélection.";
    });
};

/* ---------- Remplacer une couleur partout ---------- */

/** Remplace toutes les occurrences d'une couleur (tolérance en niveaux 0-255) dans la compo ou le projet. */
SZ.colors.replaceAll = function (fromHex, toHex, scope, tol) {
    return SZ.run("Toolkit : remplacer une couleur", function () {
        var from = SZ.colors._rgb(fromHex), to = SZ.colors._rgb(toHex), n = 0, comps = [], i;
        tol = (tol || 0) / 255 + 0.0021;
        function same(c) { return c && c.length >= 3 && Math.abs(c[0] - from[0]) <= tol && Math.abs(c[1] - from[1]) <= tol && Math.abs(c[2] - from[2]) <= tol; }
        if (scope === "project") {
            for (i = 1; i <= app.project.numItems; i++) {
                var it = app.project.item(i);
                if (it instanceof CompItem) comps.push(it);
                else if (it instanceof FootageItem && it.mainSource instanceof SolidSource && same(it.mainSource.color)) { it.mainSource.color = to; n++; }
            }
        } else {
            var c = SZ.activeComp();
            if (!c) return "ERR:Aucune composition active.";
            comps.push(c);
        }
        var seenSolid = {};
        for (var ci = 0; ci < comps.length; ci++) {
            var comp = comps[ci];
            for (var li = 1; li <= comp.numLayers; li++) {
                var L = comp.layer(li);
                if (L.locked) continue;
                try {
                    if (scope !== "project" && L.source && L.source.mainSource instanceof SolidSource && !seenSolid[L.source.id] && same(L.source.mainSource.color)) {
                        L.source.mainSource.color = to; seenSolid[L.source.id] = 1; n++;
                    }
                } catch (e) {}
                SZ.colors._walk(L, function (p) {
                    try {
                        if (p.propertyValueType === PropertyValueType.COLOR) {
                            if (p.numKeys > 0) {
                                for (var k = 1; k <= p.numKeys; k++) { var kv = p.keyValue(k); if (same(kv)) { p.setValueAtKey(k, [to[0], to[1], to[2], kv[3] == null ? 1 : kv[3]]); n++; } }
                            } else { var v = p.value; if (same(v)) { p.setValue([to[0], to[1], to[2], v[3] == null ? 1 : v[3]]); n++; } }
                        } else if (p.propertyValueType === PropertyValueType.TEXT_DOCUMENT && p.numKeys === 0) {
                            var td = p.value, ch = false;
                            if (td.applyFill && same(td.fillColor)) { td.fillColor = to; ch = true; }
                            if (td.applyStroke && same(td.strokeColor)) { td.strokeColor = to; ch = true; }
                            if (ch) { p.setValue(td); n++; }
                        }
                    } catch (e2) {}
                }, 0);
            }
        }
        if (!n) return "ERR:#" + fromHex + " introuvable " + (scope === "project" ? "dans le projet." : "dans la compo active.");
        return "OK:#" + fromHex + " → #" + toHex + " : " + n + " remplacement" + (n > 1 ? "s" : "");
    });
};
