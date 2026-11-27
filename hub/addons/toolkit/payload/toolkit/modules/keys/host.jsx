/* Module Clés — inverser, aller-retour, escalier, aligner, étirer. */

var SZ = $.global.SZ = $.global.SZ || {};
SZ.keys = {};

SZ.keys._items = function (comp, min) {
    var items = SZ.selectedKeyProps(comp), out = [];
    for (var i = 0; i < items.length; i++) if (items[i].keys.length >= min) out.push(items[i]);
    return out;
};

SZ.keys._count = function (n, mot) {
    return n + " " + mot + (n > 1 ? "s" : "");
};

/* Déplace les clés d'un item selon fn(temps) → nouveau temps.
   speedFactor : facteur de durée (les vitesses sont divisées d'autant). */
SZ.keys._remap = function (item, fn, speedFactor, fd) {
    var p = item.prop, datas = [];
    for (var i = 0; i < item.keys.length; i++) {
        var d = SZ.captureKey(p, item.keys[i]);
        var t = fn(d.t);
        d.t = Math.round(t / fd) * fd;
        if (speedFactor && speedFactor !== 1 && d.eIn) {
            var sc = function (arr) {
                var o = [];
                for (var j = 0; j < arr.length; j++) o.push(new KeyframeEase(arr[j].speed / speedFactor, arr[j].influence));
                return o;
            };
            d.eIn = sc(d.eIn); d.eOut = sc(d.eOut);
        }
        datas.push(d);
    }
    SZ.rewriteKeys(p, item.keys, datas);
};

/** Inverse l'ordre des clés sélectionnées dans le temps. */
SZ.keys.reverse = function () {
    return SZ.run("Toolkit : inverser les clés", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.keys._items(comp, 2);
        if (!items.length) return "ERR:Sélectionne au moins 2 images clés sur une propriété.";
        for (var n = 0; n < items.length; n++) {
            var p = items[n].prop, ks = items[n].keys, out = [];
            var t0 = p.keyTime(ks[0]), t1 = p.keyTime(ks[ks.length - 1]);
            for (var i = 0; i < ks.length; i++) {
                var r = SZ.reverseKey(SZ.captureKey(p, ks[i]), p.isSpatial);
                r.t = t0 + t1 - r.t;
                out.push(r);
            }
            SZ.rewriteKeys(p, ks, out);
        }
        return "OK:" + SZ.keys._count(items.length, "propriété") + " inversée" + (items.length > 1 ? "s" : "");
    });
};

/** Ajoute après la dernière clé le chemin retour (effet boomerang). */
SZ.keys.pingpong = function () {
    return SZ.run("Toolkit : aller-retour", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.keys._items(comp, 2);
        if (!items.length) return "ERR:Sélectionne au moins 2 images clés sur une propriété.";
        for (var n = 0; n < items.length; n++) {
            var p = items[n].prop, ks = items[n].keys, out = [];
            var last = ks[ks.length - 1], tEnd = p.keyTime(last);

            // La clé pivot repart dans l'autre sens : sa sortie reflète son entrée.
            var piv = SZ.captureKey(p, last), rp = SZ.reverseKey(piv, p.isSpatial);
            try { p.setInterpolationTypeAtKey(last, piv.iIn, piv.iIn); } catch (e) {}
            if (piv.eIn) { try { p.setTemporalAutoBezierAtKey(last, false); p.setTemporalContinuousAtKey(last, false); p.setTemporalEaseAtKey(last, piv.eIn, rp.eOut); } catch (e2) {} }
            if (piv.sIn) { try { p.setSpatialAutoBezierAtKey(last, false); p.setSpatialContinuousAtKey(last, false); p.setSpatialTangentsAtKey(last, piv.sIn, piv.sIn); } catch (e3) {} }

            for (var i = ks.length - 2; i >= 0; i--) {
                var r = SZ.reverseKey(SZ.captureKey(p, ks[i]), p.isSpatial);
                r.t = 2 * tEnd - r.t;
                out.push(r);
            }
            SZ.rewriteKeys(p, [], out);
        }
        return "OK:Aller-retour ajouté sur " + SZ.keys._count(items.length, "propriété");
    });
};

/** Escalier : décale chaque calque (ou ses clés sélectionnées) de N images par rapport au précédent.
    order : "sel" | "rev" | "rand" ; target : "layers" | "keys" */
SZ.keys.stagger = function (frames, order, target, curve) {
    return SZ.run("Toolkit : escalier", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var sel = comp.selectedLayers, layers = [], i;
        for (i = 0; i < sel.length; i++) layers.push(sel[i]);
        if (layers.length < 2) return "ERR:Sélectionne au moins 2 calques.";

        layers.sort(function (a, b) { return a.index - b.index; });
        if (order === "rev") layers.reverse();
        if (order === "rand") {
            for (i = layers.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1)), tmp = layers[i];
                layers[i] = layers[j]; layers[j] = tmp;
            }
        }
        var fd = comp.frameDuration, step = frames * fd, n = layers.length;
        var rank = {};
        for (i = 0; i < layers.length; i++) rank[layers[i].index] = i;
        // Décalage du rang r : linéaire, ou réparti selon la courbe choisie (total identique)
        function offsetOf(r) {
            if (!curve || n < 2) return r * step;
            return Math.round(SZ.bezier(curve, r / (n - 1)) * (n - 1) * frames) * fd;
        }

        if (target === "keys") {
            var items = SZ.selectedKeyProps(comp);
            if (!items.length) return "ERR:Sélectionne des images clés sur les calques.";
            for (i = 0; i < items.length; i++) {
                var off = offsetOf(rank[items[i].layer.index]);
                if (off) SZ.keys._remap(items[i], function (t) { return t + off; }, 1, fd);
                else { var ts0 = []; for (var q = 0; q < items[i].keys.length; q++) ts0.push(items[i].prop.keyTime(items[i].keys[q])); SZ._markKeys(items[i].prop, ts0); }
            }
            return "OK:Clés décalées en escalier (" + frames + " im.)";
        }
        var moved = 0;
        for (i = 0; i < layers.length; i++) {
            if (layers[i].locked) continue;
            layers[i].startTime += offsetOf(i);
            moved++;
        }
        return "OK:" + SZ.keys._count(moved, "calque") + " en escalier (" + frames + " im.)";
    });
};

/** Aligne la première clé sélectionnée sur l'indicateur de temps (les écarts sont conservés). */
SZ.keys.alignToCTI = function () {
    return SZ.run("Toolkit : aligner sur l'indicateur", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.keys._items(comp, 1);
        if (!items.length) return "ERR:Sélectionne des images clés.";
        var first = Infinity, i;
        for (i = 0; i < items.length; i++) first = Math.min(first, items[i].prop.keyTime(items[i].keys[0]));
        var delta = comp.time - first;
        if (Math.abs(delta) < 1e-6) return "OK:Déjà alignées.";
        for (i = 0; i < items.length; i++) SZ.keys._remap(items[i], function (t) { return t + delta; }, 1, comp.frameDuration);
        return "OK:Clés alignées sur l'indicateur";
    });
};

/** Étire / compresse le timing des clés sélectionnées autour de la première (pct = 50 → 2× plus rapide). */
SZ.keys.stretch = function (pct) {
    return SZ.run("Toolkit : étirer les clés", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        if (!(pct > 0)) return "ERR:Pourcentage invalide.";
        var items = SZ.keys._items(comp, 2);
        if (!items.length) return "ERR:Sélectionne au moins 2 images clés.";
        var first = Infinity, i, f = pct / 100;
        for (i = 0; i < items.length; i++) first = Math.min(first, items[i].prop.keyTime(items[i].keys[0]));
        for (i = 0; i < items.length; i++) {
            SZ.keys._remap(items[i], function (t) { return first + (t - first) * f; }, f, comp.frameDuration);
        }
        return "OK:Timing à " + pct + " %";
    });
};

/* ---------- Copier / coller ---------- */

/* Easing d'une clé exprimé en rapport à la vitesse moyenne des segments voisins,
   pour pouvoir le coller sur n'importe quelle propriété. */
SZ.keys._normEase = function (p, k) {
    if (!SZ._canBezier(p)) return null;
    var inAvg = k > 1 ? SZ.keyAvgSpeed(p, k - 1, k) : null;
    var outAvg = k < p.numKeys ? SZ.keyAvgSpeed(p, k, k + 1) : null;
    function norm(arr, avg) {
        var o = [];
        for (var d = 0; d < arr.length; d++) {
            var a = avg ? avg[Math.min(d, avg.length - 1)] : 0;
            o.push({ inf: arr[d].influence, r: Math.abs(a) > 1e-9 ? arr[d].speed / a : null });
        }
        return o;
    }
    return {
        iIn: p.keyInInterpolationType(k), iOut: p.keyOutInterpolationType(k),
        eIn: norm(p.keyInTemporalEase(k), inAvg), eOut: norm(p.keyOutTemporalEase(k), outAvg)
    };
};

SZ.keys.copy = function () {
    var comp = SZ.activeComp();
    if (!comp) return "ERR:Aucune composition active.";
    var items = SZ.keys._items(comp, 1);
    if (!items.length) return "ERR:Sélectionne des images clés à copier.";
    var it = items[0], p = it.prop, clip = { name: p.name, keys: [] };
    for (var i = 0; i < it.keys.length; i++) {
        clip.keys.push({ v: p.keyValue(it.keys[i]), ease: SZ.keys._normEase(p, it.keys[i]) });
    }
    SZ.keys._clip = clip;
    var msg = "OK:" + SZ.keys._count(clip.keys.length, "clé") + " copiée" + (clip.keys.length > 1 ? "s" : "") + " (" + p.name + ")";
    if (items.length > 1) msg += "\nSeule la première propriété est copiée.";
    return msg;
};

SZ.keys.pasteEasing = function () {
    return SZ.run("Toolkit : coller l'easing", function () {
        var clip = SZ.keys._clip;
        if (!clip) return "ERR:Rien à coller : copie d'abord des clés.";
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.keys._items(comp, 1);
        if (!items.length) return "ERR:Sélectionne les clés qui recevront l'easing.";
        var BZ = KeyframeInterpolationType.BEZIER, done = 0, skip = 0;

        for (var n = 0; n < items.length; n++) {
            var p = items[n].prop, ks = items[n].keys;
            if (!SZ._canBezier(p)) { skip++; continue; }
            for (var j = 0; j < ks.length; j++) {
                var src = clip.keys[j % clip.keys.length].ease;
                if (!src) continue;
                var k = ks[j];
                var inAvg = k > 1 ? SZ.keyAvgSpeed(p, k - 1, k) : null;
                var outAvg = k < p.numKeys ? SZ.keyAvgSpeed(p, k, k + 1) : null;
                var build = function (srcArr, dims, avg) {
                    var o = [];
                    for (var d = 0; d < dims; d++) {
                        var e = srcArr[Math.min(d, srcArr.length - 1)];
                        var a = avg ? avg[Math.min(d, avg.length - 1)] : 0;
                        var sp = (e.r !== null && a) ? e.r * a : 0;
                        if (p.isSpatial && sp < 0) sp = 0;
                        o.push(new KeyframeEase(sp, Math.min(100, Math.max(0.1, e.inf))));
                    }
                    return o;
                };
                var dims = p.keyInTemporalEase(k).length;
                p.setInterpolationTypeAtKey(k, src.iIn === KeyframeInterpolationType.HOLD ? src.iIn : BZ,
                                               src.iOut === KeyframeInterpolationType.HOLD ? src.iOut : BZ);
                p.setTemporalAutoBezierAtKey(k, false);
                p.setTemporalContinuousAtKey(k, false);
                p.setTemporalEaseAtKey(k, build(src.eIn, dims, inAvg), build(src.eOut, dims, outAvg));
                done++;
            }
        }
        if (!done) return "ERR:Aucune clé compatible.";
        return "OK:Easing collé sur " + SZ.keys._count(done, "clé") + (skip ? "\n" + skip + " propriété(s) sans courbe ignorée(s)" : "");
    });
};

SZ.keys.pasteValue = function () {
    return SZ.run("Toolkit : coller la valeur", function () {
        var clip = SZ.keys._clip;
        if (!clip) return "ERR:Rien à coller : copie d'abord des clés.";
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.keys._items(comp, 1);
        if (!items.length) return "ERR:Sélectionne les clés qui recevront la valeur.";
        var done = 0, bad = 0;
        for (var n = 0; n < items.length; n++) {
            var p = items[n].prop, ks = items[n].keys;
            for (var j = 0; j < ks.length; j++) {
                try { p.setValueAtKey(ks[j], clip.keys[j % clip.keys.length].v); done++; }
                catch (e) { bad++; }
            }
        }
        if (!done) return "ERR:Valeur incompatible (copiée depuis « " + clip.name + " »).";
        return "OK:Valeur collée sur " + SZ.keys._count(done, "clé") + (bad ? "\n" + bad + " clé(s) incompatible(s)" : "");
    });
};

/* ---------- Aligner / cloner ---------- */

SZ.keys._align = function (which) {
    var comp = SZ.activeComp();
    if (!comp) return "ERR:Aucune composition active.";
    var items = SZ.keys._items(comp, 1);
    if (items.length < 2) return "ERR:Sélectionne des clés sur au moins 2 propriétés.";
    var target = which === "first" ? Infinity : -Infinity, i, edge = [];
    for (i = 0; i < items.length; i++) {
        var ks = items[i].keys;
        edge[i] = items[i].prop.keyTime(which === "first" ? ks[0] : ks[ks.length - 1]);
        target = which === "first" ? Math.min(target, edge[i]) : Math.max(target, edge[i]);
    }
    var moved = 0;
    for (i = 0; i < items.length; i++) {
        var delta = target - edge[i];
        if (Math.abs(delta) < 1e-6) continue;
        SZ.keys._remap(items[i], function (t) { return t + delta; }, 1, comp.frameDuration);
        moved++;
    }
    return "OK:" + SZ.keys._count(moved, "propriété") + " alignée" + (moved > 1 ? "s" : "");
};
SZ.keys.alignFirst = function () { return SZ.run("Toolkit : aligner les débuts", function () { return SZ.keys._align("first"); }); };
SZ.keys.alignLast = function () { return SZ.run("Toolkit : aligner les fins", function () { return SZ.keys._align("last"); }); };

/** Duplique les clés sélectionnées à l'indicateur de temps (écarts conservés). */
SZ.keys.clone = function () {
    return SZ.run("Toolkit : cloner les clés", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.keys._items(comp, 1);
        if (!items.length) return "ERR:Sélectionne des images clés.";
        var first = Infinity, i, j;
        for (i = 0; i < items.length; i++) first = Math.min(first, items[i].prop.keyTime(items[i].keys[0]));
        var delta = comp.time - first, fd = comp.frameDuration;
        if (Math.abs(delta) < fd / 2) return "ERR:Place l'indicateur de temps là où cloner les clés.";
        for (i = 0; i < items.length; i++) {
            var p = items[i].prop, datas = [];
            for (j = 0; j < items[i].keys.length; j++) {
                var d = SZ.captureKey(p, items[i].keys[j]);
                d.t = Math.round((d.t + delta) / fd) * fd;
                datas.push(d);
            }
            for (j = 0; j < items[i].keys.length; j++) { try { p.setSelectedAtKey(items[i].keys[j], false); } catch (e) {} }
            SZ.rewriteKeys(p, [], datas);
        }
        return "OK:Clés clonées à l'indicateur";
    });
};

/** Inverse les valeurs des clés sélectionnées en gardant leur timing et leurs courbes. */
SZ.keys.reverseValues = function () {
    return SZ.run("Toolkit : inverser les valeurs", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.keys._items(comp, 2);
        if (!items.length) return "ERR:Sélectionne au moins 2 images clés sur une propriété.";
        for (var n = 0; n < items.length; n++) {
            var p = items[n].prop, ks = items[n].keys, vals = [], i;
            for (i = 0; i < ks.length; i++) vals.push(p.keyValue(ks[i]));
            for (i = 0; i < ks.length; i++) p.setValueAtKey(ks[i], vals[ks.length - 1 - i]);
        }
        return "OK:Valeurs inversées sur " + SZ.keys._count(items.length, "propriété") + " (timing et courbes conservés)";
    });
};

/** Recale sur une image entière les clés qui tombent entre deux images. */
SZ.keys.snapFrames = function () {
    return SZ.run("Toolkit : arrondir à l'image", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.keys._items(comp, 1);
        if (!items.length) return "ERR:Sélectionne des images clés.";
        var fd = comp.frameDuration, moved = 0;
        for (var n = 0; n < items.length; n++) {
            var p = items[n].prop, off = [], i;
            for (i = 0; i < items[n].keys.length; i++) {
                var t = p.keyTime(items[n].keys[i]), r = Math.round(t / fd) * fd;
                if (Math.abs(r - t) > fd / 1000) off.push(items[n].keys[i]);
            }
            if (!off.length) continue;
            SZ.keys._remap({ prop: p, keys: off }, function (t) { return t; }, 1, fd);
            moved += off.length;
        }
        return moved ? "OK:" + SZ.keys._count(moved, "clé") + " recalée" + (moved > 1 ? "s" : "") + " sur l'image" : "OK:Toutes les clés sont déjà sur des images entières.";
    });
};
