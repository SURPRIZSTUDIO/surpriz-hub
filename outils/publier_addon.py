#!/usr/bin/env python3
"""Publie une nouvelle version d'un addon dans le catalogue du hub.

Usage : python3 outils/publier_addon.py <id> <version> <dossier_de_l_addon>
Exemple : python3 outils/publier_addon.py toolkit 0.27.0 ~/Desktop/toolkit

Le script :
  1. crée addons/<id>/<id>-<version>.zip (le dossier zippé tel quel) ;
  2. calcule son empreinte (sha256) et sa taille ;
  3. met à jour la fiche de l'addon dans catalog.json (version + téléchargement).
Il ne reste qu'à envoyer les changements sur GitHub (commit + push).
"""
import hashlib, json, os, sys, zipfile, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    addon_id, version, src = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3]).expanduser().resolve()
    cat_path = ROOT / "catalog.json"
    cat = json.loads(cat_path.read_text(encoding="utf-8"))
    addon = next((a for a in cat["addons"] if a["id"] == addon_id), None)
    if addon is None:
        sys.exit(f"Addon inconnu dans catalog.json : {addon_id}")
    folder = addon["cep"]["folder"]
    if not (src / "CSXS" / "manifest.xml").exists():
        sys.exit(f"Pas de CSXS/manifest.xml dans {src}")
    out = ROOT / "addons" / addon_id / f"{addon_id}-{version}.zip"
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(src.rglob("*")):
            if p.name == ".DS_Store" or not p.is_file():
                continue
            z.write(p, f"{folder}/{p.relative_to(src).as_posix()}")
    data = out.read_bytes()
    addon["version"] = version
    addon["download"] = {
        "url": f"addons/{addon_id}/{out.name}",
        "sha256": hashlib.sha256(data).hexdigest(),
        "size": len(data),
    }
    cat_path.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK : {out.relative_to(ROOT)} ({len(data) // 1024} Ko), catalogue passé en {version}.")

if __name__ == "__main__":
    main()
