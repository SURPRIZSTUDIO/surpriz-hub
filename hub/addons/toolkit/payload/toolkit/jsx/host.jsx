/* Toolkit — fonctions partagées côté After Effects (ExtendScript, ES3). */

var SZ = $.global.SZ = $.global.SZ || {};

/** Charge le host.jsx d'un module. */
SZ.loadModule = function (path) {
    try {
        var f = new File(path);
        if (!f.exists) return "ERR:introuvable " + path;
        $.evalFile(f);
        return "OK";
    } catch (e) {
        return "ERR:" + e.toString();
    }
};

/** Composition active ou null. */
SZ.activeComp = function () {
    var c = app.project ? app.project.activeItem : null;
    return (c && c instanceof CompItem) ? c : null;
};

/** Exécute fn dans un groupe d'annulation, renvoie une chaîne "OK:..." ou "ERR:...". */
SZ.run = function (label, fn) {
    app.beginUndoGroup(label);
    var res;
    SZ._ksel = [];
    try {
        res = fn();
        SZ._restoreKeySel();
    } catch (e) {
        res = "ERR:" + e.toString() + (e.line ? " (ligne " + e.line + ")" : "");
    }
    SZ._ksel = [];
    app.endUndoGroup();
    return res;
};

/* Réécrire des clés (addKey/removeKey) fait perdre à After Effects la sélection des autres calques :
   on note chaque propriété touchée et ses clés, puis on resélectionne tout à la fin de l'action
   (pour pouvoir relancer l'outil plusieurs fois de suite). */
SZ._ksel = [];
SZ._markKeys = function (p, times) { SZ._ksel.push({ prop: p, times: times }); };
SZ._restoreKeySel = function () {
    var i, j, r, L;
    for (i = 0; i < SZ._ksel.length; i++) {
        r = SZ._ksel[i];
        try { L = r.prop.propertyGroup(r.prop.propertyDepth); L.selected = true; } catch (e) {}
    }
    for (i = 0; i < SZ._ksel.length; i++) {
        r = SZ._ksel[i];
        try { r.prop.selected = true; } catch (e2) {}
        for (j = 0; j < r.times.length; j++) {
            try { r.prop.setSelectedAtKey(r.prop.nearestKeyIndex(r.times[j]), true); } catch (e3) {}
        }
    }
};

/* ---------- Images clés : outils partagés ---------- */

/** Propriétés ayant des clés sélectionnées : [{ layer, prop, keys:[indices croissants] }] */
SZ.selectedKeyProps = function (comp) {
    var out = [], layers = comp.selectedLayers;
    for (var i = 0; i < layers.length; i++) {
        var props = layers[i].selectedProperties;
        for (var j = 0; j < props.length; j++) {
            var p = props[j];
            if (p.propertyType !== PropertyType.PROPERTY || !p.numKeys) continue;
            var ks = p.selectedKeys;
            if (!ks || !ks.length) continue;
            var arr = [];
            for (var k = 0; k < ks.length; k++) arr.push(ks[k]);
            arr.sort(function (a, b) { return a - b; });
            out.push({ layer: layers[i], prop: p, keys: arr });
        }
    }
    return out;
};

SZ._canBezier = function (p) {
    try { return p.isInterpolationTypeValid(KeyframeInterpolationType.BEZIER); } catch (e) { return false; }
};

/** Copie complète d'une clé (valeur, interpolations, vitesses, tangentes). */
SZ.captureKey = function (p, k) {
    var d = { t: p.keyTime(k), v: p.keyValue(k) };
    try { d.iIn = p.keyInInterpolationType(k); d.iOut = p.keyOutInterpolationType(k); } catch (e) {}
    if (SZ._canBezier(p)) {
        d.eIn = p.keyInTemporalEase(k); d.eOut = p.keyOutTemporalEase(k);
        d.tc = p.keyTemporalContinuous(k); d.ta = p.keyTemporalAutoBezier(k);
    }
    if (p.isSpatial) {
        d.sIn = p.keyInSpatialTangent(k); d.sOut = p.keyOutSpatialTangent(k);
        d.sc = p.keySpatialContinuous(k); d.sa = p.keySpatialAutoBezier(k);
        try { d.rov = p.keyRoving(k); } catch (e2) {}
    }
    try { d.lbl = p.keyLabel(k); } catch (e3) {}
    return d;
};

/** Inverse le sens d'une clé (pour un renversement dans le temps). */
SZ.reverseKey = function (d, isSpatial) {
    var r = {}, x;
    for (x in d) r[x] = d[x];
    r.iIn = d.iOut; r.iOut = d.iIn;
    if (d.eIn) {
        var flip = function (arr) {
            var o = [];
            for (var i = 0; i < arr.length; i++) o.push(new KeyframeEase(isSpatial ? arr[i].speed : -arr[i].speed, arr[i].influence));
            return o;
        };
        r.eIn = flip(d.eOut); r.eOut = flip(d.eIn);
    }
    if (d.sIn) { r.sIn = d.sOut; r.sOut = d.sIn; }
    return r;
};

/** Supprime les clés données (indices) puis recrée les copies aux nouveaux temps.
    Les nouvelles clés sont sélectionnées. */
SZ.rewriteKeys = function (p, removeIdx, datas) {
    var i, k;
    var sorted = removeIdx.slice(0).sort(function (a, b) { return b - a; });
    for (i = 0; i < sorted.length; i++) p.removeKey(sorted[i]);
    // 1) valeurs
    for (i = 0; i < datas.length; i++) {
        k = p.addKey(datas[i].t);
        p.setValueAtKey(k, datas[i].v);
    }
    // 2) interpolations, vitesses, tangentes (une fois toutes les clés posées)
    for (i = 0; i < datas.length; i++) {
        var d = datas[i];
        k = p.nearestKeyIndex(d.t);
        try { if (d.iIn !== undefined) p.setInterpolationTypeAtKey(k, d.iIn, d.iOut); } catch (e) {}
        if (d.eIn) {
            try {
                p.setTemporalContinuousAtKey(k, d.tc);
                p.setTemporalAutoBezierAtKey(k, d.ta);
                if (!d.ta) p.setTemporalEaseAtKey(k, d.eIn, d.eOut);
            } catch (e2) {}
        }
        if (d.sIn) {
            try {
                p.setSpatialContinuousAtKey(k, d.sc);
                p.setSpatialAutoBezierAtKey(k, d.sa);
                if (!d.sa) p.setSpatialTangentsAtKey(k, d.sIn, d.sOut);
            } catch (e3) {}
            try { if (d.rov) p.setRovingAtKey(k, true); } catch (e4) {}
        }
        try { if (d.lbl) p.setLabelAtKey(k, d.lbl); } catch (e5) {}
        try { p.setSelectedAtKey(k, true); } catch (e6) {}
    }
    var ts = [];
    for (i = 0; i < datas.length; i++) ts.push(datas[i].t);
    SZ._markKeys(p, ts);
};

/** Vitesse moyenne entre deux clés, par dimension d'ease (null si valeur non numérique). */
SZ.keyAvgSpeed = function (p, a, b) {
    var dt = p.keyTime(b) - p.keyTime(a);
    if (dt <= 0) return null;
    var v0 = p.keyValue(a), v1 = p.keyValue(b), n = p.keyOutTemporalEase(a).length, i, out = [];
    if (typeof v0 === "number") return [(v1 - v0) / dt];
    if (!(v0 instanceof Array)) return null;
    if (p.isSpatial) {
        var d2 = 0;
        for (i = 0; i < v0.length; i++) d2 += (v1[i] - v0[i]) * (v1[i] - v0[i]);
        return [Math.sqrt(d2) / dt];
    }
    for (i = 0; i < n; i++) out.push(((v1[i] || 0) - (v0[i] || 0)) / dt);
    return out;
};

/** Convertit des points de l'espace d'un calque vers l'espace monde (comp), calculés par AE
    via une expression temporaire. pts : [[x,y,z], …] → [[x,y,z], …] */
SZ.toWorldPoints = function (L, pts, t) {
    var fxs = L.property("ADBE Effect Parade");
    var fx = fxs.addProperty("ADBE Point3D Control");
    fx.name = "__sz_world__";
    var ctrl = fx.property(1), out = [];
    for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        ctrl.expression = "var r = thisLayer.toWorld([" + p[0] + "," + p[1] + "," + (p[2] || 0) + "]); [r[0], r[1], r.length > 2 ? r[2] : 0];";
        var v = ctrl.valueAtTime(t, false);
        out.push([v[0], v[1], v[2]]);
    }
    L.property("ADBE Effect Parade").property("__sz_world__").remove();
    return out;
};

/** Mémorise / restaure une sélection de calques (les effets temporaires la font perdre). */
SZ.keepSelection = function (layers) {
    var a = [];
    for (var i = 0; i < layers.length; i++) a.push(layers[i]);
    return function () { for (var j = 0; j < a.length; j++) { try { a[j].selected = true; } catch (e) {} } };
};

/** Chemin d'indices d'une propriété depuis son calque, pour la retrouver après modification. */
SZ.propPath = function (p) {
    var path = [];
    while (p && p.propertyDepth > 0) { path.unshift(p.propertyIndex); p = p.parentProperty; }
    return path;
};
SZ.resolvePath = function (layer, path) {
    var p = layer;
    for (var i = 0; i < path.length; i++) p = p.property(path[i]);
    return p;
};

/** Fichiers : choisir un fichier → "FILE:" + chemin */
SZ.pickFile = function (title, filter) {
    var f = File.openDialog(title || "Choisir un fichier", filter || "*.*", false);
    return f ? "FILE:" + f.fsName : "ERR:Annulé.";
};
/** Enregistrer du texte dans un fichier choisi par l'utilisateur. */
SZ.saveTextFile = function (text, defName, title) {
    var f = new File(Folder.desktop.fsName + "/" + defName).saveDialog(title || "Enregistrer", "JSON:*.json");
    if (!f) return "ERR:Export annulé.";
    if (!/\.json$/i.test(f.name)) f = new File(f.fsName + ".json");
    f.encoding = "UTF-8";
    if (!f.open("w")) return "ERR:Impossible d'écrire le fichier.";
    f.write(text);
    f.close();
    return "OK:Exporté : " + decodeURI(f.name);
};

/** Point de l'espace monde (comp) → espace d'un calque. */
SZ.fromWorldPoint = function (L, p, t) {
    var fxs = L.property("ADBE Effect Parade");
    var fx = fxs.addProperty("ADBE Point3D Control");
    fx.name = "__sz_fromworld__";
    fx.property(1).expression = "var r = thisLayer.fromWorld([" + p[0] + "," + p[1] + "," + (p[2] || 0) + "]); [r[0], r[1], r.length > 2 ? r[2] : 0];";
    var v = fx.property(1).valueAtTime(t, false);
    L.property("ADBE Effect Parade").property("__sz_fromworld__").remove();
    return [v[0], v[1], v[2]];
};

/** Choisir où enregistrer un fichier → "FILE:" + chemin (l'extension est ajoutée si besoin). */
SZ.pickSavePath = function (defName, title, ext) {
    var f = new File(Folder.desktop.fsName + "/" + defName).saveDialog(title || "Enregistrer");
    if (!f) return "ERR:Annulé.";
    var p = f.fsName;
    if (ext && p.toLowerCase().slice(-ext.length) !== ext.toLowerCase()) p += ext;
    return "FILE:" + p;
};

/** Courbe de Bézier (format CSS) évaluée en t ∈ [0,1] → progression. */
SZ.bezier = function (c, t) {
    if (!c) return t;
    var lo = 0, hi = 1, u = t;
    for (var i = 0; i < 30; i++) {
        u = (lo + hi) / 2;
        var x = 3 * (1 - u) * (1 - u) * u * c[0] + 3 * (1 - u) * u * u * c[2] + u * u * u;
        if (x < t) lo = u; else hi = u;
    }
    return 3 * (1 - u) * (1 - u) * u * c[1] + 3 * (1 - u) * u * u * c[3] + u * u * u;
};
