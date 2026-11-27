# SÜRPRIZ HÜB — catalogue en ligne et code de l'app

Ce dépôt sert de serveur à **SÜRPRIZ HÜB**. Les utilisateurs ne viennent jamais ici : à chaque ouverture, le hub lit `catalog.json`, compare avec ce qui est installé et propose les nouveautés et mises à jour.

## Contenu

| Fichier | Rôle |
|---|---|
| `catalog.json` | La liste des addons : nom, version, textes FR/EN, fichier à télécharger. |
| `addons/<id>/<id>-<version>.zip` | Les fichiers de chaque version d'un addon. |
| `addons/<id>/shots/` | Les captures affichées dans le hub. |
| `addons/<id>/guides/` | Les guides PDF ouverts depuis le hub. |
| `outils/publier_addon.py` | Script qui prépare une nouvelle version. |
| `hub/` | Le code de l'app SÜRPRIZ HÜB (Mac et Windows). |
| `.github/workflows/hub-release.yml` | Construction et publication automatiques du hub. |

## Publier une mise à jour

Le plus simple : demander à Claude « publie Toolkit 0.28.0 » avec le nouveau dossier `toolkit` et la liste des changements.

À la main :

```
python3 outils/publier_addon.py toolkit 0.28.0 chemin/vers/le/dossier/toolkit \
    --fr "Couleurs : nouveau bouton pour copier une palette." \
    --en "Colors: new button to copy a palette."
git add . && git commit -m "Toolkit 0.28.0" && git push
```

Le script zippe le dossier, calcule son empreinte (le hub vérifie que le fichier téléchargé est intact), met à jour la version
dans `catalog.json` et ajoute les notes de version en tête de `changelog`. Le hub affiche ces notes (« Nouveautés ») sur la
carte de l'addon quand une mise à jour est disponible, sur sa fiche, et à la fin de la mise à jour. Les utilisateurs voient
« Mise à jour disponible » à leur prochaine ouverture du hub (quelques minutes de délai possibles, le temps que GitHub rafraîchisse).

## Ajouter un nouvel addon

Ajouter une fiche dans `catalog.json` (sur le modèle de Toolkit) puis publier sa première version avec le script. Le champ `type` indique comment l'installer : `cep` pour After Effects, Premiere, Photoshop, Illustrator. Pour un autre logiciel (Blender…), le hub a besoin d'un module d'installation en plus.

## Installer le hub sur un Mac

Une seule ligne à coller dans Terminal (aucun réglage de sécurité à faire, la dernière version est vérifiée puis rangée dans Applications) :

```
curl -fsSL https://raw.githubusercontent.com/SURPRIZSTUDIO/surpriz-hub/main/install-mac.sh | bash
```

## Nouvelle version du hub

Changer `version` dans `hub/package.json` puis pousser sur `main` (ou demander à Claude « publie le hub 1.3.0 »).
GitHub fait le reste tout seul (onglet **Actions**, une dizaine de minutes) :

1. tests, puis construction des apps Mac (Apple Silicon, Intel) et Windows ;
2. création de la release `hub-v<version>` avec les trois zips ;
3. mise à jour de la section `hub` de `catalog.json` (version, adresses et empreintes des zips).

Les hubs installés affichent alors « Mettre à jour » : ils téléchargent la bonne version, vérifient son empreinte,
se remplacent et se rouvrent. Le hub 1.1 n'a pas encore ce bouton : il propose seulement le téléchargement.

## Addons payants (plus tard)

Les champs `price` et `license` sont réservés. Les fichiers d'un addon payant ne seront pas mis ici (ce dépôt est public) : ils passeront par un petit serveur qui vérifie la clé Gumroad avant le téléchargement.
