# Sürpriz Hub — catalogue en ligne

Ce dépôt sert de serveur au **Sürpriz Hub**. Les utilisateurs ne viennent jamais ici : à chaque ouverture, le hub lit `catalog.json`, compare avec ce qui est installé et propose les nouveautés et mises à jour.

## Contenu

| Fichier | Rôle |
|---|---|
| `catalog.json` | La liste des addons : nom, version, textes FR/EN, fichier à télécharger. |
| `addons/<id>/<id>-<version>.zip` | Les fichiers de chaque version d'un addon. |
| `addons/<id>/shots/` | Les captures affichées dans le hub. |
| `addons/<id>/guides/` | Les guides PDF ouverts depuis le hub. |
| `outils/publier_addon.py` | Script qui prépare une nouvelle version. |

## Publier une mise à jour

Le plus simple : demander à Claude « publie Toolkit 0.27.0 » avec le nouveau dossier `toolkit`.

À la main :

```
python3 outils/publier_addon.py toolkit 0.27.0 chemin/vers/le/dossier/toolkit
git add . && git commit -m "Toolkit 0.27.0" && git push
```

Le script zippe le dossier, calcule son empreinte (le hub vérifie que le fichier téléchargé est intact) et met à jour la version dans `catalog.json`. Les utilisateurs voient « Mise à jour disponible » à leur prochaine ouverture du hub (quelques minutes de délai possibles, le temps que GitHub rafraîchisse).

## Ajouter un nouvel addon

Ajouter une fiche dans `catalog.json` (sur le modèle de Toolkit) puis publier sa première version avec le script. Le champ `type` indique comment l'installer : `cep` pour After Effects, Premiere, Photoshop, Illustrator. Pour un autre logiciel (Blender…), le hub a besoin d'un module d'installation en plus.

## Nouvelle version du hub

`hub.version` dans `catalog.json` : si elle est plus récente que celle de l'app, le hub affiche un bandeau avec un lien vers `hub.download` (la page Releases de ce dépôt). Déposer les zips Mac et Windows du hub dans une nouvelle Release.

## Addons payants (plus tard)

Les champs `price` et `license` sont réservés. Les fichiers d'un addon payant ne seront pas mis ici (ce dépôt est public) : ils passeront par un petit serveur qui vérifie la clé Gumroad avant le téléchargement.
