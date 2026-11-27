/* Module Expressions — rebond, inertie, boucles, wiggle, avec curseurs de réglage. */

var SZ = $.global.SZ = $.global.SZ || {};
SZ.expr = {};

/* Code commun : index de la dernière clé passée. */
SZ.expr._lastKey =
    "var n = 0;\n" +
    "if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\n";

/* Définition des presets : contrôles (nom, valeur par défaut) + code. Dans le code,
   C0, C1… sont remplacés par la lecture du contrôle correspondant. */
SZ.expr.PRESETS = {
    bounce: {
        label: "Rebond",
        controls: [["Élasticité", 0.7], ["Gravité", 5000], ["Rebonds max", 9]],
        needKeys: true,
        code:
            "var e = C0, g = C1, nMax = Math.round(C2);\n" + SZ.expr._lastKey +
            "if (n > 0 && e > 0 && g > 0) {\n" +
            "  var t = time - key(n).time;\n" +
            "  var v = mul(velocityAtTime(key(n).time - thisComp.frameDuration / 10), -e);\n" +
            "  var vl = (value instanceof Array) ? length(v) : Math.abs(v);\n" +
            "  var vu = (value instanceof Array) ? (vl > 0 ? normalize(v) : mul(v, 0)) : (v < 0 ? -1 : 1);\n" +
            "  var tCur = 0, seg = 2 * vl / g, tNext = seg, nb = 1;\n" +
            "  while (tNext < t && nb <= nMax) { vl *= e; seg *= e; tCur = tNext; tNext += seg; nb++; }\n" +
            "  if (nb <= nMax) { var d = t - tCur; add(value, mul(vu, d * (vl - g * d / 2))); } else value;\n" +
            "} else value;"
    },
    inertia: {
        label: "Inertie",
        controls: [["Amplitude", 5], ["Fréquence", 3], ["Amortissement", 6]],
        needKeys: true,
        code:
            "var amp = C0 / 100, freq = C1, decay = C2;\n" + SZ.expr._lastKey +
            "var t = n > 0 ? time - key(n).time : 0;\n" +
            "if (n > 0 && t > 0) {\n" +
            "  var v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n" +
            "  add(value, mul(v, amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t)));\n" +
            "} else value;"
    },
    wiggle: {
        label: "Wiggle",
        controls: [["Fréquence", 2], ["Amplitude", 30], ["Boucle (s)", 0]],
        needKeys: false,
        code:
            "var f = C0, a = C1, L = C2;\n" +
            "if (L > 0) {\n" +
            "  var t = time % L;\n" +
            "  linear(t, 0, L, wiggle(f, a, 1, 0.5, t), wiggle(f, a, 1, 0.5, t - L));\n" +
            "} else wiggle(f, a);"
    },
    blink: {
        label: "Clignotement",
        controls: [["Fréquence", 2], ["Opacité basse", 0]],
        needKeys: false,
        code: "var f = C0, lowV = C1;\n(Math.sin(time * f * 2 * Math.PI) >= 0) ? value : (value instanceof Array ? mul(value, lowV / 100) : lowV);"
    },
    spin: {
        label: "Rotation continue",
        controls: [["Vitesse (°/s)", 90]],
        needKeys: false,
        code: "value + time * C0;"
    },
    counter: {
        label: "Compteur",
        controls: [["Valeur", 0], ["Décimales", 0], ["Séparateur milliers", 1]],
        needKeys: false,
        code:
            "var v = C0, d = Math.max(0, Math.round(C1));\n" +
            "var s = Math.abs(v).toFixed(d).split(\".\");\n" +
            "if (C2 > 0) s[0] = s[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, \" \");\n" +
            "(v < 0 ? \"-\" : \"\") + s.join(\",\");"
    },
    loopCycle:    { label: "Boucle", controls: [], needKeys: true, code: "loopOut(\"cycle\");" },
    loopPingpong: { label: "Boucle aller-retour", controls: [], needKeys: true, code: "loopOut(\"pingpong\");" },
    loopOffset:   { label: "Boucle cumulée", controls: [], needKeys: true, code: "loopOut(\"offset\");" },
    loopContinue: { label: "Continuer", controls: [], needKeys: true, code: "loopOut(\"continue\");" }
};

SZ.expr._esc = function (s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, "\\\""); };

/* Toutes les expressions du calque, sauf celle de la propriété « skip ». */
SZ.expr._layerExpressions = function (layer, skip) {
    var out = [], skipPath = skip ? SZ.propPath(skip).join(",") : "";
    SZ.expr._walkProps(layer, function (p) {
        try {
            if (!p.canSetExpression || !p.expression) return;
            if (skipPath && SZ.propPath(p).join(",") === skipPath) return;
            out.push(p.expression);
        } catch (e) {}
    }, 0);
    return out.join("\n");
};
SZ.expr._walkProps = function (g, cb, depth) {
    if (depth > 10) return;
    var n = 0;
    try { n = g.numProperties; } catch (e) { return; }
    for (var i = 1; i <= n; i++) {
        var p; try { p = g.property(i); } catch (e2) { continue; }
        if (!p) continue;
        if (p.propertyType === PropertyType.PROPERTY) cb(p); else SZ.expr._walkProps(p, cb, depth + 1);
    }
};

/* Supprime les réglages utilisés par l'expression d'une propriété,
   sauf s'ils servent encore à une autre expression du calque. */
SZ.expr._removeControls = function (layer, prop) {
    var ex = prop.expression || "";
    if (ex.indexOf("// Toolkit") < 0 && ex.indexOf("// SÜR-CORE") < 0 && ex.indexOf("// Sürpriz") < 0) return;
    var re = /effect\("((?:[^"\\]|\\.)*)"\)/g, m, names = [], seen = {};
    while ((m = re.exec(ex)) !== null) {
        var nm = m[1].replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
        if (!seen[nm]) { seen[nm] = 1; names.push(nm); }
    }
    if (!names.length) return;
    var others = SZ.expr._layerExpressions(layer, prop);
    var fxs = layer.property("ADBE Effect Parade");
    for (var i = 0; i < names.length; i++) {
        if (others.indexOf("effect(\"" + SZ.expr._esc(names[i]) + "\")") >= 0) continue;
        try { var f = fxs.property(names[i]); if (f) f.remove(); } catch (e) {}
    }
};

/* Propriétés sélectionnées acceptant une expression : [{layer, prop}] */
SZ.expr._selected = function (comp) {
    var out = [], layers = comp.selectedLayers;
    for (var i = 0; i < layers.length; i++) {
        var props = layers[i].selectedProperties;
        for (var j = 0; j < props.length; j++) {
            var p = props[j];
            if (p.propertyType === PropertyType.PROPERTY && p.canSetExpression) out.push({ layer: layers[i], path: SZ.propPath(p) });
        }
    }
    return out;
};

SZ.expr.apply = function (presetId) {
    return SZ.run("Toolkit : expression", function () {
        var P = SZ.expr.PRESETS[presetId];
        if (!P) return "ERR:Preset inconnu.";
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.expr._selected(comp);
        if (!items.length) return "ERR:Sélectionne une propriété (Position, Échelle…) dans la timeline.";

        var keep = SZ.keepSelection(comp.selectedLayers), done = 0, warn = [];
        for (var i = 0; i < items.length; i++) {
            var L = items[i].layer, path = items[i].path, p = SZ.resolvePath(L, path), pname = p.name;
            if (P.needKeys && p.numKeys < 2) warn.push("« " + pname + " » : il faut au moins 2 images clés pour cet effet");

            SZ.expr._removeControls(L, p);
            var code = P.code;
            for (var c = 0; c < P.controls.length; c++) {
                // Un jeu de réglages par effet et par calque, partagé par les propriétés :
                // « Inertie · Amplitude », « Inertie · Fréquence »…
                var fxName = P.label + " · " + P.controls[c][0];
                var fxs = L.property("ADBE Effect Parade");
                var fx = fxs.property(fxName);
                if (!fx) {
                    fx = fxs.addProperty("ADBE Slider Control");
                    fx.name = fxName;
                    fx.property(1).setValue(P.controls[c][1]);
                }
                code = code.split("C" + c).join("effect(\"" + SZ.expr._esc(fxName) + "\")(1)");
            }
            // l'ajout d'effets invalide la référence : on la retrouve par son chemin
            p = SZ.resolvePath(L, path);
            p.expression = "// Toolkit · " + P.label + "\n" + code;
            done++;
        }
        keep();
        var msg = "OK:" + P.label + " appliqué sur " + done + " propriété" + (done > 1 ? "s" : "");
        if (warn.length) msg += "\n" + warn.join("\n");
        return msg;
    });
};

SZ.expr.clear = function () {
    return SZ.run("Toolkit : retirer les expressions", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.expr._selected(comp);
        if (!items.length) return "ERR:Sélectionne les propriétés à nettoyer.";
        var keep = SZ.keepSelection(comp.selectedLayers), n = 0;
        for (var i = 0; i < items.length; i++) {
            var path = items[i].path, p = SZ.resolvePath(items[i].layer, path);
            if (!p.expression) continue;
            SZ.expr._removeControls(items[i].layer, p);
            p = SZ.resolvePath(items[i].layer, path);
            p.expression = "";
            n++;
        }
        keep();
        return "OK:" + n + " expression" + (n > 1 ? "s retirées" : " retirée");
    });
};

/* ---------- Expressions personnelles ---------- */

/** Récupère l'expression de la première propriété sélectionnée qui en a une.
    Renvoie "EXP:" + nom + "\u0001" + code */
SZ.expr.capture = function () {
    var comp = SZ.activeComp();
    if (!comp) return "ERR:Aucune composition active.";
    var layers = comp.selectedLayers;
    for (var i = 0; i < layers.length; i++) {
        var props = layers[i].selectedProperties;
        for (var j = 0; j < props.length; j++) {
            var p = props[j];
            if (p.propertyType === PropertyType.PROPERTY && p.canSetExpression && p.expression) {
                return "EXP:" + p.name + "\u0001" + p.expression;
            }
        }
    }
    return "ERR:Sélectionne une propriété qui contient déjà une expression.";
};

/** Pose une expression libre sur les propriétés sélectionnées. */
SZ.expr.applyCustom = function (name, code) {
    return SZ.run("Toolkit : " + name, function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var items = SZ.expr._selected(comp);
        if (!items.length) return "ERR:Sélectionne une propriété (Position, Échelle…) dans la timeline.";
        var keep = SZ.keepSelection(comp.selectedLayers), done = 0, errs = [];
        for (var i = 0; i < items.length; i++) {
            var p = SZ.resolvePath(items[i].layer, items[i].path);
            SZ.expr._removeControls(items[i].layer, p);
            p = SZ.resolvePath(items[i].layer, items[i].path);
            p.expression = code;
            try { if (p.expressionError) errs.push("« " + p.name + " » : " + p.expressionError.split("\n")[0]); } catch (e) {}
            done++;
        }
        keep();
        var msg = "OK:« " + name + " » appliqué sur " + done + " propriété" + (done > 1 ? "s" : "");
        if (errs.length) msg = "ERR:Expression posée mais en erreur\n" + errs.join("\n");
        return msg;
    });
};

/** Enregistre du texte dans un fichier choisi par l'utilisateur. */
SZ.expr.exportFile = function (text, defName) {
    var f = new File(Folder.desktop.fsName + "/" + defName).saveDialog("Exporter les expressions", "JSON:*.json");
    if (!f) return "ERR:Export annulé.";
    if (!/\.json$/i.test(f.name)) f = new File(f.fsName + ".json");
    f.encoding = "UTF-8";
    if (!f.open("w")) return "ERR:Impossible d'écrire le fichier.";
    f.write(text);
    f.close();
    return "OK:Exporté : " + f.name;
};

/** Lit un fichier choisi par l'utilisateur. Renvoie "TXT:" + nom + "\u0001" + contenu */
SZ.expr.importFile = function () {
    var f = File.openDialog("Importer des expressions (.json, .txt, .jsx)", "*.json;*.txt;*.jsx", false);
    if (!f) return "ERR:Import annulé.";
    f.encoding = "UTF-8";
    if (!f.open("r")) return "ERR:Impossible de lire le fichier.";
    var txt = f.read();
    f.close();
    return "TXT:" + decodeURI(f.name) + "\u0001" + txt;
};
