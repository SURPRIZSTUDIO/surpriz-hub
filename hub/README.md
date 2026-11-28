# SÜRPRIZ HÜB

Application Mac et Windows qui installe les addons Sürpriz en un clic.
Premier addon : **Toolkit** pour After Effects.

## Ajouter un addon

1. Mettre ses fichiers dans `addons/<id>/` (par exemple `addons/toolkit/payload/toolkit`).
2. Ajouter sa fiche dans `addons/catalog.json` : nom, version, logiciel (`host`), type d'installation (`type`), textes FR/EN, outils, captures, guides.
3. Types d'installation disponibles : `cep` (After Effects, Premiere, Photoshop, Illustrator) dans `src/installers/cep.js`.
   Pour Blender, ajouter un fichier `src/installers/blender.js` avec les mêmes fonctions (`status`, `install`, `uninstall`) et le déclarer dans `src/main.js`.

## Commandes

- `npm install` puis `npm start` : lancer le hub en développement.
- `npm test` : tests du moteur d'installation.
- `node test/updater.test.js` : tests de la mise à jour du hub lui-même (Windows : PowerShell requis).
- `node test/winInstall.test.js` : tests de l'installation Windows « comme une app ».
- `xvfb-run -a npx electron test/electron-asar.test.js --no-sandbox` : même chose dans Electron (app.asar doit rester un fichier).
- `RCODESIGN=… tools/release.sh <dossier>` : construire, signer et zipper les versions Mac et Windows (c'est ce que fait GitHub à chaque nouvelle version).

## Mise à jour du hub

`src/updater.js` : le hub lit la section `hub` du catalogue en ligne. Si une version plus récente y est annoncée avec un zip
pour son système, le bouton « Mettre à jour » la télécharge, vérifie son empreinte, puis un petit script remplace l'app
une fois fermée et la rouvre. En cas d'échec, l'ancienne version est remise en place et le hub le signale au démarrage.
Sur Mac, l'app doit être dans Applications : sinon un bandeau propose « Ranger dans Applications ».

## Installation Windows

`src/winInstall.js` : ouvert depuis Téléchargements, le hub se copie dans `%LOCALAPPDATA%\Programs\SURPRIZ HUB`,
crée ses raccourcis (menu Démarrer, Bureau), s'inscrit dans Paramètres › Applications, puis se rouvre depuis là.
Si une version égale ou plus récente est déjà installée, il ouvre simplement celle-ci. La désinstallation passe par
Paramètres › Applications (les addons installés restent en place).

L'app Mac est signée « ad hoc » (sans compte développeur Apple) : à la première ouverture, macOS demande de l'autoriser dans Réglages Système › Confidentialité et sécurité.
Pour une ouverture sans avertissement, il faut signer et notariser avec un compte Apple Developer (99 $/an), et signer l'exe Windows avec un certificat de signature de code.
