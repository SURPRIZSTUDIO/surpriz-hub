# Toolkit — panneau After Effects par Sürpriz

Hub CEP qui charge des modules (outils). Accès libre : aucune licence n'est demandée.

**Modules**
- **Compos** : créer des compos (réseaux sociaux, Full HD, 4K, formats perso ; durée en secondes, images ou timecode) ; marges de sécurité Reels / Stories / TikTok / grille 3:4 (calque guide) ; adapter la compo active à d'autres formats ; dupliquer en profondeur.
- **Ancrage** : 9 positions, par calque ou commun à toute la sélection, compensation de position (2D, 3D, parentage), option contour.
- **Courbes** : éditeur de Bézier façon Flow (vue qui s'adapte aux dépassements, aperçu animé, pelure d'oignon), presets intégrés et personnels, favoris (☆), « Copier des clés » pour récupérer une courbe existante. Double-clic sur un preset = appliquer. Maj en glissant = magnétisme.
- **Clés** : inverser les valeurs (timing et courbes gardés), arrondir les clés à l'image, escalier régulier ou selon la courbe, copier / coller la valeur (la courbe copiée part aussi dans Courbes), inverser, miroir, aligner début / fin, cloner à l'indicateur, aligner sur l'indicateur, escalier, étirer le timing.
- **Couleurs** : sélecteur maison (HEX, RGB, TSL visibles), bibliothèque de palettes nommées (glisser pour réordonner, tri Ordre / Récentes / A→Z, recherche, étoile pour garder en haut, créer, renommer, supprimer, importer .ase / .json / .txt, exporter .json, créer depuis les couleurs du projet), couleurs récentes, pipette sur la sélection, remplissage ou contour, outils de contour, remplacer une couleur partout (compo ou projet, avec tolérance), export d'une palette en .ase.

- **Expressions** : rebond, inertie, wiggle, clignotement, rotation continue, compteur, boucles ; un seul jeu de réglages par effet et par calque (« Inertie · Amplitude »…) ; bibliothèque « Mes expressions » (enregistrer, récupérer depuis une propriété, importer / exporter en .json).
- **Calques** : découper puis enchaîner (escalier automatique), null de contrôle (un pour toute la sélection, centré sur sa boîte, ou un par calque), découpage d'un calque de forme par groupe ou d'un texte de point par lettre / mot / ligne, ancrages centrés.
- **Projet** (affiché en bas de l'onglet Compos) : ranger par type, fusionner les doublons, supprimer l'inutilisé ; renommage par modèle (`{nom}`, `##`).

- **Export** (dans l'esprit d'Anubis) : profils d'export enregistrables ; un bouton pour rendre la compo active ou les compos sélectionnées dans le panneau Projet, sur la zone de travail ou la compo entière ; noms automatiques par jetons (`[comp]`, `[projet]`, `[date]`, `[heure]`, `[taille]`, `[fps]`) sans jamais écraser un fichier ; dossier à côté du projet (chemin relatif), fixe ou demandé ; compression MP4 (basse / moyenne / haute, plusieurs à la fois) ou GIF via ffmpeg, redimensionnement, suppression du rendu intermédiaire ; envoi à Media Encoder ; compression de fichiers existants.

### ffmpeg (compression)
La compression utilise ffmpeg. Le panneau le cherche dans cet ordre : chemin choisi dans le panneau, dossier `bin/` de l'extension (`bin/ffmpeg` ou `bin/ffmpeg.exe`), emplacements habituels (Homebrew, `C:\ffmpeg\bin`), puis le PATH.
Pour la version commerciale, livrer ffmpeg dans `bin/` (une version Mac et une Windows ; prendre une build LGPL et citer la licence). Sans ffmpeg, l'export passe par le module de sortie H.264 d'After Effects (AE 2023 et plus).

### Ergonomie
- **Onglets en icônes** (nom au survol, ou affiché si l'option est activée).
- **Réglages (⚙)** : glisser pour réordonner les onglets, décocher pour les ranger dans le menu **☰**. Par défaut : Formats, Ancrage, Courbes, Clés, Expressions.
- **Accès rapide** : clic droit sur un bouton pour l'épingler en haut du panneau, visible dans tous les onglets ; clic droit sur un raccourci pour le retirer. Un module peut fournir une action directe via `pin(btn, api)` (ex. preset de courbe, format, expression perso) ; sinon le clic est rejoué dans le module monté hors écran.
- **Sections repliables** : clic sur un titre de section ; l'état est mémorisé par onglet.

### Langue
Réglages (⚙) › Langue : Français ou English. Le code reste en français ; `js/i18n.js` traduit l'interface et les messages à la volée (dictionnaire `EXACT` pour les textes fixes, `RULES` pour les messages avec nombres ou noms). Pour un nouveau texte, ajouter sa traduction dans ce fichier.

### Où sont gardées les données
Palettes, presets de courbes, expressions perso, formats perso, accès rapide et disposition sont communs à tous les projets After Effects. Ils sont recopiés dans un fichier qui survit aux mises à jour et réinstallations du plugin :
- Mac : `~/Library/Application Support/SUR-CORE/donnees.json`
- Windows : `%APPDATA%\SUR-CORE\donnees.json`

## Structure

```
sur-core/
├── CSXS/manifest.xml      déclaration de l'extension (AE 2021 et plus)
├── index.html             le hub
├── css/style.css
├── js/
│   ├── config.js          ← numéro de version
│   ├── bridge.js          communication panneau ↔ After Effects
│   └── main.js            chargement des modules, onglets, réglages
├── jsx/host.jsx           fonctions ExtendScript partagées
└── modules/
    ├── modules.json       liste utilisée seulement pour l'aperçu navigateur
    └── anchor/
        ├── module.json    nom, ordre, version
        ├── panel.js       interface du module
        └── host.jsx       logique After Effects
```

## Installer

Le plus simple : lancer **Installer Toolkit (Windows).bat** ou **Installer Toolkit (Mac).command**, livrés à côté du dossier `toolkit` dans le zip. Le script :
1. autorise les extensions non signées pour CEP 9 à 16 (`PlayerDebugMode`), ce qui couvre After Effects 2021 à 2027 ;
2. retire toute ancienne copie de Toolkit (même identifiant `com.surpriz.surcore`, quel que soit le nom du dossier) ;
3. copie `toolkit` dans le dossier des extensions (et lève la quarantaine sur Mac).

À la main :
1. **Autoriser les extensions non signées**, pour chaque version de CEP (9 à 16) :
   - Mac : `defaults write com.adobe.CSXS.13 PlayerDebugMode 1` (répéter pour 9 à 16)
   - Windows : `reg add HKCU\Software\Adobe\CSXS.13 /v PlayerDebugMode /t REG_SZ /d 1 /f` (répéter pour 9 à 16)
2. **Copier le dossier `toolkit`** dans :
   - Mac : `~/Library/Application Support/Adobe/CEP/extensions/`
   - Windows : `%APPDATA%\Adobe\CEP\extensions\`
3. Relancer After Effects → **Fenêtre › Extensions › Toolkit**.

**Panneau présent dans le menu mais qui ne s'ouvre pas** (typique après une mise à jour d'After Effects) : la nouvelle version d'After Effects utilise un numéro de CEP pour lequel `PlayerDebugMode` n'est pas encore activé. Relancer l'installeur règle le problème. Vérifier aussi qu'il n'y a pas deux copies de Toolkit dans le dossier des extensions.

Débogage : avec le panneau ouvert, aller sur `http://localhost:8088` dans Chrome pour avoir la console.

## Ajouter un module

Créer `modules/mon-outil/` avec trois fichiers :

**module.json**
```json
{ "id": "mon-outil", "name": "Mon outil", "order": 2, "version": "0.1.0" }
```

**host.jsx** (ExtendScript)
```js
var SZ = SZ || {};
SZ.monOutil = {
  go: function (valeur) {
    return SZ.run("Toolkit : mon outil", function () {
      var comp = SZ.activeComp();
      if (!comp) return "ERR:Aucune composition active.";
      // ...
      return "OK:Terminé";
    });
  }
};
```

**panel.js**
```js
SZ.register({
  id: "mon-outil",
  mount: function (el, api) {
    el.innerHTML = '<button class="btn primary">Lancer</button>';
    el.querySelector("button").onclick = function () { api.run("SZ.monOutil.go", [42]); };
  }
});
```

Le hub détecte le dossier automatiquement au lancement. `api.run` affiche le message `OK:`/`ERR:` dans la barre d'état ; `api.store` garde des réglages entre les sessions.
Pour l'aperçu dans un navigateur, ajouter aussi l'id dans `modules/modules.json`.

## Aperçu de l'interface sans After Effects

```
cd sur-core && python3 -m http.server 8000
```
puis ouvrir `http://localhost:8000` : les actions sont simulées.

## Publier

1. Une extension **signée** n'a pas besoin de `PlayerDebugMode` chez les clients.
2. Signer avec **ZXPSignCmd** (outil gratuit d'Adobe) :
   ```
   ZXPSignCmd -selfSignedCert FR Paris Surpriz Surpriz MOTDEPASSE cert.p12
   ZXPSignCmd -sign toolkit Toolkit.zxp cert.p12 MOTDEPASSE -tsa http://timestamp.digicert.com
   ```
   Exclure du ZXP : `.debug`, `README.md`, `modules/modules.json`.
3. Diffuser le `.zxp` ; il s'installe avec un installeur ZXP (ex. aescripts ZXP Installer).

## Limites connues

- Ancrage : si l'échelle ou la rotation est animée, la compensation est exacte à l'instant courant uniquement (un avertissement s'affiche). Les calques verrouillés, caméras et lumières sont ignorés.
