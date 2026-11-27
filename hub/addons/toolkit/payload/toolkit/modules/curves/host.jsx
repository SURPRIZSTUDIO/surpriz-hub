/* Module Courbes — applique une courbe de Bézier (format CSS cubic-bezier)
   aux images clés sélectionnées, en la convertissant en vitesse/influence AE. */

var SZ = $.global.SZ = $.global.SZ || {};
SZ.curves = {};

/* Écart de valeur entre deux clés, par dimension d'ease. null si non numérique. */
SZ.curves._deltas = function (p, v0, v1, n) {
    var i, out = [];
    if (typeof v0 === "number") return [v1 - v0];
    if (!(v0 instanceof Array)) return null;
    if (p.isSpatial) {
        var d2 = 0;
        for (i = 0; i < v0.length; i++) d2 += (v1[i] - v0[i]) * (v1[i] - v0[i]);
        return [Math.sqrt(d2)];
    }
    for (i = 0; i < n; i++) out.push((v1[i] || 0) - (v0[i] || 0));
    return out;
};

/* Tracés (forme, masque) : la valeur n'est pas un nombre, AE interpole la forme de 0 à 100 %.
   On mesure combien de « progression par seconde » donne une vitesse de 1 entre les clés a et b,
   en posant une vitesse connue et en lisant la forme juste après la clé a.
   Renvoie [1 / k] (l'écart équivalent, à utiliser comme pour un nombre) ou null. */
SZ.curves._shapeVec = function (sh) {
    var out = [], lists = [sh.vertices, sh.inTangents, sh.outTangents], i, j;
    for (i = 0; i < lists.length; i++) for (j = 0; j < lists[i].length; j++) out.push(lists[i][j][0], lists[i][j][1]);
    return out;
};
SZ.curves._pathDelta = function (p, a, b) {
    var v0 = p.keyValue(a), v1 = p.keyValue(b);
    if (!v0 || !v1 || !v0.vertices || !v1.vertices || v0.vertices.length !== v1.vertices.length) return null;
    var A = SZ.curves._shapeVec(v0), B = SZ.curves._shapeVec(v1), D = [], den = 0, i;
    for (i = 0; i < A.length; i++) { D.push(B[i] - A[i]); den += D[i] * D[i]; }
    if (den < 1e-9) return null;
    function prog(t) {
        var V = SZ.curves._shapeVec(p.valueAtTime(t, true)), s = 0;
        for (var n = 0; n < A.length; n++) s += (V[n] - A[n]) * D[n];
        return s / den;
    }
    var BZ = KeyframeInterpolationType.BEZIER, ta = p.keyTime(a), dt = p.keyTime(b) - ta;
    p.setInterpolationTypeAtKey(a, p.keyInInterpolationType(a), BZ);
    p.setInterpolationTypeAtKey(b, BZ, p.keyOutInterpolationType(b));
    p.setTemporalContinuousAtKey(a, false); p.setTemporalAutoBezierAtKey(a, false);
    p.setTemporalEaseAtKey(a, p.keyInTemporalEase(a), [new KeyframeEase(1, 33.33)]);
    var e = dt * 0.004;
    var k = (4 * prog(ta + e) - prog(ta + 2 * e)) / (2 * e);   // pente au départ (Richardson)
    if (!(Math.abs(k) > 1e-9)) return null;
    return [1 / k];
};
/* Même mesure, sans rien laisser changé (pour « Copier des clés »). */
SZ.curves._pathDeltaSafe = function (p, a, b) {
    var keep = [a, b], saved = [], i, r = null;
    for (i = 0; i < keep.length; i++) saved.push({
        iIn: p.keyInInterpolationType(keep[i]), iOut: p.keyOutInterpolationType(keep[i]),
        eIn: p.keyInTemporalEase(keep[i]), eOut: p.keyOutTemporalEase(keep[i]),
        tc: p.keyTemporalContinuous(keep[i]), ta: p.keyTemporalAutoBezier(keep[i])
    });
    try { r = SZ.curves._pathDelta(p, a, b); } catch (e) { r = null; }
    for (i = 0; i < keep.length; i++) {
        var k = keep[i], d = saved[i];
        try {
            p.setInterpolationTypeAtKey(k, d.iIn, d.iOut);
            p.setTemporalContinuousAtKey(k, d.tc); p.setTemporalAutoBezierAtKey(k, d.ta);
            p.setTemporalEaseAtKey(k, d.eIn, d.eOut);
        } catch (e2) {}
    }
    return r;
};

SZ.curves._clampInf = function (x) {
    return Math.min(100, Math.max(0.1, x * 100));
};

/* Une courbe qui dépasse (Back…) donne une vitesse négative : impossible sur une Position liée (vitesse ≥ 0).
   Solution : séparer les dimensions (X, Y, Z) puis appliquer la courbe sur chacune.
   sep : true → séparer sans demander ; sinon on renvoie « ASK:5|question|bouton » et le panneau propose de le faire. */
SZ.curves._canSeparate = function (p) {
    return p.matchName === "ADBE Position" && !p.dimensionsSeparated;
};
SZ.curves._separate = function (it) {
    var p = it.prop, times = [], out = [], i, d;
    for (i = 0; i < it.keys.length; i++) times.push(p.keyTime(it.keys[i]));
    p.dimensionsSeparated = true;
    var dims = it.layer.threeDLayer ? 3 : 2;
    for (d = 0; d < dims; d++) {
        var f = p.getSeparationFollower(d), ks = [];
        for (i = 0; i < times.length; i++) {
            var k = f.nearestKeyIndex(times[i]);
            if (k && Math.abs(f.keyTime(k) - times[i]) < 1e-4) ks.push(k);
        }
        if (ks.length) { out.push({ layer: it.layer, prop: f, keys: ks }); SZ._markKeys(f, times); }
    }
    return out;
};

SZ.curves.apply = function (x1, y1, x2, y2, part, sep) {
    // part : "auto" (défaut) | "both" | "out" (départ) | "in" (arrivée).
    // auto : 2 clés ou plus → courbe entière entre elles ; 1 seule clé → seulement son côté
    //        (sortie si c'est la 1re clé, entrée si c'est la dernière, les deux au milieu).
    part = part || "auto";
    return SZ.run("Toolkit : courbe", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.selectedKeyProps(comp);
        if (!items.length) return "ERR:Sélectionne des images clés (2 pour la courbe entière, 1 pour un seul côté).";

        // Dépassement sur une Position liée → séparation des dimensions (avec accord, ou automatique)
        if (y1 < 0 || y2 > 1) {
            var need = 0, j;
            for (j = 0; j < items.length; j++) if (SZ.curves._canSeparate(items[j].prop)) need++;
            if (need) {
                if (sep !== true) return "ASK:5|autoSeparate|Cette courbe dépasse : sur une Position, il faut séparer les dimensions (X / Y) pour l'appliquer. Séparer ?|Séparer";
                var conv = [];
                for (j = 0; j < items.length; j++) {
                    if (SZ.curves._canSeparate(items[j].prop)) conv = conv.concat(SZ.curves._separate(items[j]));
                    else conv.push(items[j]);
                }
                items = conv;
            }
        }

        var segs = 0, warn = {};
        var BZ = KeyframeInterpolationType.BEZIER;
        var ix1 = Math.max(x1, 0.001), ix2 = Math.max(1 - x2, 0.001);

        for (var n = 0; n < items.length; n++) {
            var p = items[n].prop, ks = items[n].keys;
            if (!SZ._canBezier(p)) { warn["« " + p.name + " » n'accepte pas les courbes"] = 1; continue; }
            var segList = [], s0;
            if (ks.length >= 2) {
                for (s0 = 0; s0 < ks.length - 1; s0++) segList.push([ks[s0], ks[s0 + 1], part === "auto" ? "both" : part]);
            } else {
                var k1 = ks[0];
                if (k1 < p.numKeys) segList.push([k1, k1 + 1, part === "auto" ? "out" : part]);
                if (k1 > 1) segList.push([k1 - 1, k1, part === "auto" ? "in" : part]);
                if (!segList.length) { warn["« " + p.name + " » n'a qu'une seule clé"] = 1; continue; }
            }

            for (var i = 0; i < segList.length; i++) {
                var a = segList[i][0], b = segList[i][1], sp = segList[i][2];
                var dt = p.keyTime(b) - p.keyTime(a);
                var dims = p.keyOutTemporalEase(a).length;
                var dv = SZ.curves._deltas(p, p.keyValue(a), p.keyValue(b), dims);
                if (!dv) { try { dv = SZ.curves._pathDelta(p, a, b); } catch (eP) { dv = null; } }
                if (!dv) { warn["« " + p.name + " » : clés impossibles à lire (formes identiques ou nombre de points différent)"] = 1; continue; }

                var outE = [], inE = [];
                for (var d = 0; d < dims; d++) {
                    var v = dv[d] || 0;
                    var sOut = v * y1 / (ix1 * dt);
                    var sIn = v * (1 - y2) / (ix2 * dt);
                    if (p.isSpatial && (sOut < 0 || sIn < 0)) {
                        warn["Dépassement impossible sur une position (vitesse ≥ 0), courbe adaptée"] = 1;
                        sOut = Math.max(0, sOut); sIn = Math.max(0, sIn);
                    }
                    outE.push(new KeyframeEase(sOut, SZ.curves._clampInf(x1)));
                    inE.push(new KeyframeEase(sIn, SZ.curves._clampInf(1 - x2)));
                }

                if (sp !== "in") {
                    p.setInterpolationTypeAtKey(a, p.keyInInterpolationType(a), BZ);
                    p.setTemporalAutoBezierAtKey(a, false); p.setTemporalContinuousAtKey(a, false);
                    p.setTemporalEaseAtKey(a, p.keyInTemporalEase(a), outE);
                }
                if (sp !== "out") {
                    p.setInterpolationTypeAtKey(b, BZ, p.keyOutInterpolationType(b));
                    p.setTemporalAutoBezierAtKey(b, false); p.setTemporalContinuousAtKey(b, false);
                    p.setTemporalEaseAtKey(b, inE, p.keyOutTemporalEase(b));
                }
                segs++;
            }
        }
        if (!segs) {
            var w0 = []; for (var m0 in warn) w0.push(m0);
            return "ERR:" + (w0.length ? w0.join("\n") : "Aucun segment à modifier.");
        }
        var msg = "OK:Courbe appliquée sur " + segs + " segment" + (segs > 1 ? "s" : "");
        var w = []; for (var m in warn) w.push(m);
        if (w.length) msg += "\n" + w.join("\n");
        return msg;
    });
};

/* Lit la courbe entre les 2 premières clés sélectionnées → "BEZ:x1,y1,x2,y2" */
SZ.curves.read = function () {
    var comp = SZ.activeComp();
    if (!comp) return "ERR:Aucune composition active.";
    var items = SZ.selectedKeyProps(comp);
    for (var n = 0; n < items.length; n++) {
        var p = items[n].prop, ks = items[n].keys;
        if (ks.length < 2 || !SZ._canBezier(p)) continue;
        var a = ks[0], b = ks[1];
        var dt = p.keyTime(b) - p.keyTime(a);
        var dv = SZ.curves._deltas(p, p.keyValue(a), p.keyValue(b), p.keyOutTemporalEase(a).length);
        if (!dv) {
            app.beginUndoGroup("Toolkit : lire la courbe");
            dv = SZ.curves._pathDeltaSafe(p, a, b);
            app.endUndoGroup();
        }
        if (!dv) continue;
        // première dimension qui bouge vraiment
        var d = 0;
        while (d < dv.length - 1 && Math.abs(dv[d]) < 1e-6) d++;
        if (Math.abs(dv[d]) < 1e-6) return "ERR:Les deux clés ont la même valeur, courbe illisible.";

        var eo = p.keyOutTemporalEase(a)[d], ei = p.keyInTemporalEase(b)[d];
        var x1 = eo.influence / 100;
        var y1 = eo.speed * x1 * dt / dv[d];
        var x2 = 1 - ei.influence / 100;
        var y2 = 1 - ei.speed * (1 - x2) * dt / dv[d];
        if (p.keyOutInterpolationType(a) === KeyframeInterpolationType.LINEAR) { x1 = y1 = 1 / 3; x2 = y2 = 2 / 3; }
        var r = function (x) { return Math.round(x * 1000) / 1000; };
        return "BEZ:" + r(x1) + "," + r(y1) + "," + r(x2) + "," + r(y2);
    }
    return "ERR:Sélectionne 2 images clés sur une propriété animée.";
};
