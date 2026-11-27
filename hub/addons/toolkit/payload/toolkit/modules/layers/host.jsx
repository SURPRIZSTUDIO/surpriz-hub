/* Module Calques — null de contrôle, découpage de formes et de textes. */

var SZ = $.global.SZ = $.global.SZ || {};
SZ.layers = {};

SZ.layers._isAV = function (L) { return !(L instanceof CameraLayer || L instanceof LightLayer); };

SZ.layers._inSel = function (L, sel) {
    for (var i = 0; i < sel.length; i++) if (sel[i].index === L.index) return true;
    return false;
};

/* ---------- Null de contrôle ---------- */

/** mode : "group" (un null pour la sélection) | "each" (un null par calque) */
SZ.layers.makeNull = function (mode, doParent) {
    return SZ.run("Toolkit : null de contrôle", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var sel = [], i, s = comp.selectedLayers;
        for (i = 0; i < s.length; i++) sel.push(s[i]);
        if (!sel.length) return "ERR:Sélectionne au moins un calque.";
        var t = comp.time, nulls = [], warn = [];

        if (mode === "each") {
            for (i = 0; i < sel.length; i++) {
                var L = sel[i];
                var ap = L.property("ADBE Transform Group").property("ADBE Anchor Point").valueAtTime(t, false);
                var w = L.locked || !SZ.layers._isAV(L)
                    ? L.property("ADBE Transform Group").property("ADBE Position").valueAtTime(t, false)
                    : SZ.toWorldPoints(L, [[ap[0], ap[1], ap[2] || 0]], t)[0];
                w = [w[0], w[1], w[2] || 0];
                var nl = SZ.layers._newNull(comp, "CTRL · " + L.name, L.threeDLayer, w, L.inPoint, L.outPoint);
                nl.moveBefore(L);
                if (doParent) {
                    if (L.parent) nl.parent = L.parent;
                    if (L.locked) warn.push(L.name + " verrouillé : non parenté");
                    else L.parent = nl;
                }
                nulls.push(nl);
            }
        } else {
            var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
            var any3D = false, top = sel[0], tIn = Infinity, tOut = -Infinity;
            for (i = 0; i < sel.length; i++) {
                var A = sel[i], pts;
                if (A.threeDLayer) any3D = true;
                if (A.index < top.index) top = A;
                tIn = Math.min(tIn, A.inPoint); tOut = Math.max(tOut, A.outPoint);
                if (SZ.layers._isAV(A) && !A.locked) {
                    var r = A.sourceRectAtTime(t, false);
                    pts = SZ.toWorldPoints(A, [[r.left, r.top, 0], [r.left + r.width, r.top, 0],
                        [r.left, r.top + r.height, 0], [r.left + r.width, r.top + r.height, 0]], t);
                } else {
                    var pp = A.property("ADBE Transform Group").property("ADBE Position").valueAtTime(t, false);
                    pts = [[pp[0], pp[1], pp[2] || 0]];
                }
                for (var k = 0; k < pts.length; k++) for (var d = 0; d < 3; d++) {
                    mn[d] = Math.min(mn[d], pts[k][d]); mx[d] = Math.max(mx[d], pts[k][d]);
                }
            }
            var c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
            var name = sel.length === 1 ? "CTRL · " + sel[0].name : "CTRL";
            var N = SZ.layers._newNull(comp, name, any3D, c, tIn, tOut);
            N.moveBefore(top);

            if (doParent) {
                // Calques « racines » de la sélection : leur parent n'est pas dans la sélection.
                var roots = [], shared = undefined, same = true;
                for (i = 0; i < sel.length; i++) {
                    var P = sel[i].parent;
                    if (P && SZ.layers._inSel(P, sel)) continue;
                    roots.push(sel[i]);
                    var pid = P ? P.index : 0;
                    if (shared === undefined) shared = pid; else if (shared !== pid) same = false;
                }
                if (same && shared) N.parent = comp.layer(shared);
                else if (!same) warn.push("Les calques avaient des parents différents : ils sont maintenant tous rattachés au null");
                for (i = 0; i < roots.length; i++) {
                    if (roots[i].locked) { warn.push(roots[i].name + " verrouillé : non parenté"); continue; }
                    roots[i].parent = N;
                }
            }
            nulls.push(N);
        }

        for (i = 0; i < sel.length; i++) sel[i].selected = false;
        for (i = 0; i < nulls.length; i++) nulls[i].selected = true;
        var msg = "OK:" + nulls.length + " null" + (nulls.length > 1 ? "s" : "") + " créé" + (nulls.length > 1 ? "s" : "");
        if (warn.length) msg += "\n" + warn.join("\n");
        return msg;
    });
};

SZ.layers._newNull = function (comp, name, is3D, worldPos, tIn, tOut) {
    var N = comp.layers.addNull();
    N.name = name;
    N.label = 1;
    if (is3D) N.threeDLayer = true;
    N.property("ADBE Transform Group").property("ADBE Anchor Point").setValue(is3D ? [50, 50, 0] : [50, 50]);
    N.property("ADBE Transform Group").property("ADBE Position").setValue(is3D ? worldPos : [worldPos[0], worldPos[1]]);
    try { N.inPoint = tIn; N.outPoint = tOut; } catch (e) {}
    return N;
};

/* ---------- Découper ---------- */

SZ.layers._center = function (L, t, warn) {
    if (SZ.anchor && SZ.anchor.applyLayer) SZ.anchor.applyLayer(L, 0.5, 0.5, false, t, warn);
};

/* Calque de forme → un calque par groupe de premier niveau. */
SZ.layers._splitShape = function (L, t, warn, mode) {
    var root = L.property("ADBE Root Vectors Group"), groups = [], i, j;
    for (i = 1; i <= root.numProperties; i++) {
        var g = root.property(i);
        if (g.matchName === "ADBE Vector Group" && g.enabled) groups.push({ idx: i, name: g.name });
    }
    if (groups.length < 2) { warn.push(L.name + " : moins de 2 groupes, rien à découper"); return []; }

    // Mots / lignes : on regroupe les groupes (une lettre chacun après conversion d'un texte)
    // d'après leur position. Lettres : un calque par groupe.
    var clusters;
    if (mode === "words" || mode === "lines") clusters = SZ.layers._clusterGroups(L, groups, mode, t);
    else { clusters = []; for (var gi = 0; gi < groups.length; gi++) clusters.push([groups[gi]]); }   // (pas de .map en ExtendScript)
    if (clusters.length < 2) { warn.push(L.name + " : un seul " + (mode === "lines" ? "ligne" : "mot") + ", rien à découper"); return []; }

    var made = [];
    for (i = 0; i < clusters.length; i++) {
        var keepIdx = {}, label = "";
        for (j = 0; j < clusters[i].length; j++) { keepIdx[clusters[i][j].idx] = 1; label += clusters[i][j].name.length <= 2 ? clusters[i][j].name : (j ? " " : "") + clusters[i][j].name; }
        var D = L.duplicate();
        var droot = D.property("ADBE Root Vectors Group");
        for (var k = droot.numProperties; k >= 1; k--) {
            if (!keepIdx[k] && droot.property(k).matchName === "ADBE Vector Group") droot.property(k).remove();
        }
        D.name = (clusters[i].length > 1 || groups[0].name.length <= 2) ? label : L.name + " · " + label;
        D.enabled = true;
        if (made.length) D.moveAfter(made[made.length - 1]);
        SZ.layers._center(D, t, warn);
        made.push(D);
    }
    return made;
};

/* Boîte de chaque groupe (on n'affiche qu'un groupe à la fois pour la mesurer),
   puis regroupement en lignes (position verticale) et en mots (écart horizontal). */
SZ.layers._clusterGroups = function (L, groups, mode, t) {
    var root = L.property("ADBE Root Vectors Group"), i, j;
    var state = [];
    for (i = 1; i <= root.numProperties; i++) state.push(root.property(i).enabled);
    for (i = 0; i < groups.length; i++) {
        for (j = 1; j <= root.numProperties; j++) root.property(j).enabled = (j === groups[i].idx);
        var r = L.sourceRectAtTime(t, false);
        groups[i].l = r.left; groups[i].r = r.left + r.width;
        groups[i].t = r.top; groups[i].b = r.top + r.height;
        groups[i].cy = r.top + r.height / 2; groups[i].h = r.height;
    }
    for (i = 1; i <= root.numProperties; i++) root.property(i).enabled = state[i - 1];

    var hs = []; for (var hi = 0; hi < groups.length; hi++) hs.push(groups[hi].h);
    hs.sort(function (a, b) { return a - b; });
    var H = hs[Math.floor(hs.length / 2)] || 10;

    // Lignes : groupes dont le centre vertical est proche
    var byY = groups.slice(0).sort(function (a, b) { return a.cy - b.cy; }), lines = [], cur = null;
    for (i = 0; i < byY.length; i++) {
        if (!cur || byY[i].cy - cur.cy > H * 0.6) { cur = { cy: byY[i].cy, items: [] }; lines.push(cur); }
        cur.items.push(byY[i]);
    }
    var out = [];
    for (i = 0; i < lines.length; i++) {
        var row = lines[i].items.sort(function (a, b) { return a.l - b.l; });
        if (mode === "lines") { out.push(row); continue; }
        // Mots : un écart plus large qu'un espace habituel sépare deux mots
        var word = [row[0]];
        for (j = 1; j < row.length; j++) {
            if (row[j].l - row[j - 1].r > H * 0.28) { out.push(word); word = []; }
            word.push(row[j]);
        }
        out.push(word);
    }
    return out;
};

/* Convertit un calque de texte en calque de forme (commande « Créer des formes à partir du texte »). */
SZ.layers._textToShape = function (comp, L) {
    var ids = [3781];
    try { var a = app.findMenuCommandId("Create Shapes from Text"); if (a) ids.unshift(a); } catch (e) {}
    try { var b = app.findMenuCommandId("Créer des formes à partir du texte"); if (b) ids.unshift(b); } catch (e2) {}
    var before = comp.numLayers;
    for (var i = 0; i < comp.numLayers; i++) comp.layer(i + 1).selected = false;
    L.selected = true;
    for (var k = 0; k < ids.length && comp.numLayers === before; k++) {
        try { app.executeCommand(ids[k]); } catch (e3) {}
    }
    if (comp.numLayers === before) return null;
    var sel = comp.selectedLayers;
    for (var s = 0; s < sel.length; s++) if (sel[s].matchName === "ADBE Vector Layer") return sel[s];
    // sinon : la forme est créée juste au-dessus du texte
    var above = comp.layer(L.index - 1);
    return above && above.matchName === "ADBE Vector Layer" ? above : null;
};

/* Texte (de point) → un calque par lettre, mot ou ligne, à la même place. */
SZ.layers._splitText = function (L, mode, t, warn) {
    var st = L.property("ADBE Text Properties").property("ADBE Text Document");
    if (st.numKeys > 0) { warn.push(L.name + " : texte animé, ignoré"); return []; }
    var td = st.value;
    if (td.boxText) { warn.push(L.name + " : texte de paragraphe. Clic droit › Convertir en texte de point, puis réessaie"); return []; }

    var LEFT = ParagraphJustification.LEFT_JUSTIFY;
    var lead = td.fontSize * 1.2;
    try { if (!td.autoLeading && td.leading) lead = td.leading; } catch (e) {}
    var J = td.justification;

    // Calque témoin pour mesurer les morceaux
    var M = L.duplicate(), mst = M.property("ADBE Text Properties").property("ADBE Text Document");
    function measure(str) {
        var d = mst.value; d.text = str; d.justification = LEFT; mst.setValue(d);
        var r = M.sourceRectAtTime(t, false);
        return { left: r.left, right: r.left + r.width };
    }

    var lines = td.text.split(/\r\n|\r|\n|\u0003/), pieces = [], li, m;
    for (li = 0; li < lines.length; li++) {
        var line = lines[li];
        if (!/\S/.test(line)) continue;
        var lr = measure(line).right;
        var shift = (J === ParagraphJustification.CENTER_JUSTIFY) ? -lr / 2 : (J === ParagraphJustification.RIGHT_JUSTIFY ? -lr : 0);
        var re = mode === "lines" ? /\S(.*\S)?/g : (mode === "words" ? /\S+/g : /\S/g);
        while ((m = re.exec(line)) !== null) {
            var tok = m[0], end = m.index + tok.length;
            var pr = measure(line.substring(0, end)).right;
            var pc = measure(tok).right;
            pieces.push({ text: tok, dx: shift + pr - pc, dy: li * lead });
            if (pieces.length > 300) break;
        }
    }
    M.remove();
    if (pieces.length < 2) { warn.push(L.name + " : un seul morceau, rien à découper"); return []; }

    var made = [];
    for (var i = 0; i < pieces.length; i++) {
        var D = L.duplicate();
        var dst = D.property("ADBE Text Properties").property("ADBE Text Document");
        var d2 = dst.value; d2.text = pieces[i].text; d2.justification = LEFT; dst.setValue(d2);
        var ap = D.property("ADBE Transform Group").property("ADBE Anchor Point");
        var delta = [-pieces[i].dx, -pieces[i].dy, 0];
        if (SZ.anchor && SZ.anchor._shift) SZ.anchor._shift(ap, delta);
        else { var a = ap.value; ap.setValue([a[0] + delta[0], a[1] + delta[1], a[2] || 0]); }
        D.name = pieces[i].text;
        if (made.length) D.moveAfter(made[made.length - 1]);
        SZ.layers._center(D, t, warn);
        made.push(D);
    }
    return made;
};

/** Découpe les calques sélectionnés. textMode : "letters" | "words" | "lines" ; keep : garder l'original (masqué) */
SZ.layers.split = function (textMode, keep, textAs, chainFrames, chainCurve) {
    return SZ.run("Toolkit : découper", function () {
        var comp = SZ.activeComp();
        if (!comp) return "ERR:Aucune composition active.";
        var sel = [], i, s = comp.selectedLayers;
        for (i = 0; i < s.length; i++) sel.push(s[i]);
        if (!sel.length) return "ERR:Sélectionne un calque de forme ou de texte.";
        var t = comp.time, warn = [], all = [], done = 0;

        for (i = 0; i < sel.length; i++) {
            var L = sel[i], made = [], src = L;
            if (L.locked) { warn.push(L.name + " : verrouillé, ignoré"); continue; }
            if (L.matchName === "ADBE Text Layer" && textAs === "shapes") {
                // Texte → formes, puis découpage des formes
                var S = SZ.layers._textToShape(comp, L);
                if (!S) { warn.push(L.name + " : conversion en formes impossible, découpage en texte éditable"); made = SZ.layers._splitText(L, textMode, t, warn); }
                else {
                    S.name = L.name;
                    made = SZ.layers._splitShape(S, t, warn, textMode);
                    if (made.length) S.remove(); else { S.remove(); L.enabled = true; }
                }
            }
            else if (L.matchName === "ADBE Vector Layer") made = SZ.layers._splitShape(L, t, warn, textMode);
            else if (L.matchName === "ADBE Text Layer") made = SZ.layers._splitText(L, textMode, t, warn);
            else { warn.push(L.name + " : ni forme ni texte, ignoré"); continue; }
            if (!made.length) continue;
            if (keep) { src.enabled = false; src.selected = false; }
            else src.remove();
            all = all.concat(made);
            done++;
        }
        // Enchaîner : chaque morceau démarre quelques images après le précédent (ordre de lecture)
        if (done && chainFrames > 0 && all.length > 1) {
            var fd = comp.frameDuration, n = all.length;
            for (i = 0; i < n; i++) {
                var off = chainCurve ? Math.round(SZ.bezier(chainCurve, i / (n - 1)) * (n - 1) * chainFrames) * fd : i * chainFrames * fd;
                all[i].startTime += off;
            }
        }
        for (i = 0; i < comp.numLayers; i++) comp.layer(i + 1).selected = false;
        for (i = 0; i < all.length; i++) all[i].selected = true;
        if (!done) return "ERR:" + (warn.length ? warn.join("\n") : "Rien à découper.");
        var msg = "OK:" + all.length + " calques créés" + (chainFrames > 0 && all.length > 1 ? ", enchaînés toutes les " + chainFrames + " im." : "");
        if (warn.length) msg += "\n" + warn.join("\n");
        return msg;
    });
};
