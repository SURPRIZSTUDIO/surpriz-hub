/* Module Point d'ancrage — côté After Effects (ExtendScript). */

// $.global : garantit que le module s'attache à l'objet global,
// quelle que soit la façon dont le fichier est évalué.
var SZ = $.global.SZ = $.global.SZ || {};
SZ.anchor = {};

/* Ajoute delta à une propriété (toutes ses clés si elle est animée). */
SZ.anchor._shift = function (prop, delta) {
    var i, k, v, out;
    function add(val) {
        if (typeof val === "number") return val + delta[0];
        out = [];
        for (i = 0; i < val.length; i++) out.push(val[i] + (delta[i] || 0));
        return out;
    }
    if (prop.numKeys > 0) {
        for (k = 1; k <= prop.numKeys; k++) prop.setValueAtKey(k, add(prop.keyValue(k)));
    } else {
        prop.setValue(add(prop.value));
    }
};

/* Position exacte du point (x,y,z en espace calque) dans l'espace du parent,
   calculée par AE lui-même via une expression temporaire (gère rotation,
   échelle, orientation 3D, parentage, auto-orientation). */
SZ.anchor._toParentSpace = function (layer, pt, t) {
    var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Point3D Control");
    fx.name = "__sz_tmp__";
    var expr =
        "var p = thisLayer.toWorld([" + pt[0] + "," + pt[1] + "," + pt[2] + "]);" +
        "var r = thisLayer.hasParent ? thisLayer.parent.fromWorld(p) : p;" +
        "[r[0], r[1], r.length > 2 ? r[2] : 0];";
    var ctrl = fx.property(1);
    ctrl.expression = expr;
    var v = ctrl.valueAtTime(t, false);
    var res = [v[0], v[1], v[2]];
    layer.property("ADBE Effect Parade").property("__sz_tmp__").remove();
    return res;
};

/* Demi-épaisseur maximale des contours actifs d'un calque de forme,
   en tenant compte de l'échelle des groupes qui les contiennent. */
SZ.anchor._strokePad = function (layer, t) {
    var pad = [0, 0];
    function walk(group, sx, sy) {
        if (!group) return;
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            try { if (p.enabled === false) continue; } catch (e) {}
            var mn = p.matchName;
            if (mn === "ADBE Vector Group") {
                var sc = [100, 100];
                try { sc = p.property("ADBE Vector Transform Group").property("ADBE Vector Scale").valueAtTime(t, false); } catch (e2) {}
                walk(p.property("ADBE Vectors Group"), sx * sc[0] / 100, sy * sc[1] / 100);
            } else if (mn === "ADBE Vector Graphic - Stroke") {
                var w = p.property("ADBE Vector Stroke Width").valueAtTime(t, false) / 2;
                pad[0] = Math.max(pad[0], Math.abs(w * sx));
                pad[1] = Math.max(pad[1], Math.abs(w * sy));
            }
        }
    }
    walk(layer.property("ADBE Root Vectors Group"), 1, 1);
    return pad;
};

SZ.anchor._isAnimated = function (p) {
    return p && (p.numKeys > 0 || (p.expressionEnabled && p.expression !== ""));
};

/** Place l'ancrage d'un calque (fx, fy : fraction de sa boîte) en compensant la position.
    Utilisable par d'autres modules. */
SZ.anchor.applyLayer = function (L, fx, fy, extents, t, warn, forced) {
    warn = warn || [];
    var tr = L.property("ADBE Transform Group");
    var ap = tr.property("ADBE Anchor Point");
    var oldA = ap.valueAtTime(t, false);
    // Boîte du tracé seul, puis élargie de la moitié de l'épaisseur du contour
    // (le contour est centré sur le tracé). On lit l'épaisseur nous-mêmes :
    // l'option "extents" d'AE donne des boîtes trop larges.
    var r = L.sourceRectAtTime(t, false);
    if (extents && L.matchName === "ADBE Vector Layer") {
        var pad = SZ.anchor._strokePad(L, t);
        r = { left: r.left - pad[0], top: r.top - pad[1],
              width: r.width + 2 * pad[0], height: r.height + 2 * pad[1] };
    }
    var target = forced ? [forced[0], forced[1], oldA.length > 2 ? oldA[2] : 0] : [
        r.left + r.width * fx,
        r.top + r.height * fy,
        oldA.length > 2 ? oldA[2] : 0
    ];

    var oldP = SZ.anchor._toParentSpace(L, oldA.length > 2 ? oldA : [oldA[0], oldA[1], 0], t);
    var newP = SZ.anchor._toParentSpace(L, target, t);
    var dP = [newP[0] - oldP[0], newP[1] - oldP[1], newP[2] - oldP[2]];
    var dA = [target[0] - oldA[0], target[1] - oldA[1], 0];

    // Références à reprendre : ajouter/retirer un effet invalide les anciennes.
    tr = L.property("ADBE Transform Group");
    ap = tr.property("ADBE Anchor Point");
    var pos = tr.property("ADBE Position");

    // Avertissement si la compensation ne peut pas être exacte sur toute la durée.
    var risky = ["ADBE Scale", "ADBE Rotate Z", "ADBE Rotate X", "ADBE Rotate Y", "ADBE Orientation"];
    for (var j = 0; j < risky.length; j++) {
        if (SZ.anchor._isAnimated(tr.property(risky[j]))) {
            warn.push(L.name + " : échelle/rotation animée, compensation exacte seulement à l'instant courant");
            break;
        }
    }
    if (SZ.anchor._isAnimated(ap) && ap.numKeys === 0) warn.push(L.name + " : expression sur l'ancrage");

    SZ.anchor._shift(ap, dA);

    if (pos.dimensionsSeparated) {
        SZ.anchor._shift(tr.property("ADBE Position_0"), [dP[0]]);
        SZ.anchor._shift(tr.property("ADBE Position_1"), [dP[1]]);
        if (L.threeDLayer) SZ.anchor._shift(tr.property("ADBE Position_2"), [dP[2]]);
    } else {
        SZ.anchor._shift(pos, L.threeDLayer ? dP : [dP[0], dP[1], 0]);
    }
};

/**
 * Place le point d'ancrage des calques sélectionnés.
 * fx, fy : fraction de la boîte (0 = gauche/haut, 0.5 = centre, 1 = droite/bas)
 * extents : inclure contours/effets dans la boîte
 */
SZ.anchor.set = function (fx, fy, extents) {
    return SZ.run("Toolkit : point d'ancrage", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var layers = comp.selectedLayers;
        if (!layers.length) return "ERR:Sélectionne au moins un calque.";

        var t = comp.time, done = 0, warn = [];
        var keep = [];
        for (var s = 0; s < layers.length; s++) keep.push(layers[s]);

        for (var i = 0; i < layers.length; i++) {
            var L = layers[i];
            if (L instanceof CameraLayer || L instanceof LightLayer) { warn.push(L.name + " ignoré (caméra/lumière)"); continue; }
            if (L.locked) { warn.push(L.name + " ignoré (verrouillé)"); continue; }

            SZ.anchor.applyLayer(L, fx, fy, extents, t, warn);
            done++;
        }
        // L'ajout/retrait de l'effet temporaire désélectionne le calque : on restaure la sélection.
        for (var k = 0; k < keep.length; k++) { try { keep[k].selected = true; } catch (e) {} }

        var msg = "OK:" + done + " calque" + (done > 1 ? "s" : "") + " mis à jour";
        if (warn.length) msg += "\n" + warn.join("\n");
        return msg;
    });
};

/**
 * Ancrage commun : place l'ancrage de chaque calque sur le même point,
 * pris dans la boîte englobant TOUTE la sélection (pour tourner un groupe autour de son centre).
 */
SZ.anchor.setGroup = function (fx, fy, extents) {
    return SZ.run("Toolkit : ancrage commun", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var sel = [], i, s = comp.selectedLayers;
        for (i = 0; i < s.length; i++) {
            if (s[i] instanceof CameraLayer || s[i] instanceof LightLayer || s[i].locked) continue;
            sel.push(s[i]);
        }
        if (sel.length < 1) return "ERR:Sélectionne au moins un calque.";
        var t = comp.time, keep = SZ.keepSelection(sel), warn = [];
        var mn = [Infinity, Infinity], mx = [-Infinity, -Infinity];
        for (i = 0; i < sel.length; i++) {
            var L = sel[i], r = L.sourceRectAtTime(t, false);
            if (extents && L.matchName === "ADBE Vector Layer") {
                var pad = SZ.anchor._strokePad(L, t);
                r = { left: r.left - pad[0], top: r.top - pad[1], width: r.width + 2 * pad[0], height: r.height + 2 * pad[1] };
            }
            var pts = SZ.toWorldPoints(L, [[r.left, r.top, 0], [r.left + r.width, r.top, 0], [r.left, r.top + r.height, 0], [r.left + r.width, r.top + r.height, 0]], t);
            for (var k = 0; k < 4; k++) {
                mn[0] = Math.min(mn[0], pts[k][0]); mn[1] = Math.min(mn[1], pts[k][1]);
                mx[0] = Math.max(mx[0], pts[k][0]); mx[1] = Math.max(mx[1], pts[k][1]);
            }
        }
        var world = [mn[0] + (mx[0] - mn[0]) * fx, mn[1] + (mx[1] - mn[1]) * fy, 0];
        for (i = 0; i < sel.length; i++) {
            var local = SZ.fromWorldPoint(sel[i], world, t);
            SZ.anchor.applyLayer(sel[i], fx, fy, extents, t, warn, local);
        }
        keep();
        var msg = "OK:Ancrage commun placé sur " + sel.length + " calque" + (sel.length > 1 ? "s" : "");
        if (warn.length) msg += "\n" + warn.join("\n");
        return msg;
    });
};
