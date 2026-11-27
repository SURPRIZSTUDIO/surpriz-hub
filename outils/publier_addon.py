#!/usr/bin/env python3
"""Publie une nouvelle version d'un addon dans le catalogue du hub, avec ses notes de version.

Usage :
  python3 outils/publier_addon.py <id> <version> <dossier_de_l_addon> --fr "Note" [--fr "Note"…] [--en "Note"…]

Exemple :
  python3 outils/publier_addon.py toolkit 0.28.0 ~/Desktop/toolkit \\
      --fr "Couleurs : nouveau bouton pour copier une palette." \\
      --en "Colors: new button to copy a palette."

Le script :
  1. crée addons/<id>/<id>-<version>.zip (le dossier zippé tel quel) ;
  2. calcule son empreinte (sha256) et sa taille ;
  3. met à jour la fiche de l'addon dans catalog.json (version, téléchargement) ;
  4. ajoute les notes de version en tête de « changelog » : le hub les affiche (« Nouveautés »).
Il ne reste qu'à envoyer les changements sur GitHub (commit + push).
"""
import argparse, datetime, hashlib, json, sys, zipfile, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser(usage=__doc__)
    ap.add_argument("id"); ap.add_argument("version"); ap.add_argument("dossier")
    ap.add_argument("--fr", action="append", default=[], help="note de version en français (répéter pour plusieurs)")
    ap.add_argument("--en", action="append", default=[], help="note de version en anglais (répéter pour plusieurs)")
    ap.add_argument("--date", default=datetime.date.today().isoformat(), help="date de la version (AAAA-MM-JJ)")
    args = ap.parse_args()
    addon_id, version = args.id, args.version
    src = pathlib.Path(args.dossier).expanduser().resolve()
    if not args.fr:
        sys.exit("Ajoute au moins une note de version : --fr \"…\" (et --en \"…\" pour l'anglais).")

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
    entry = {"version": version, "date": args.date, "notes": {"fr": args.fr, "en": args.en or args.fr}}
    log = [e for e in addon.get("changelog", []) if e.get("version") != version]
    addon["changelog"] = [entry] + log
    # garder l'ordre lisible des clés : changelog juste après version
    ordered = {}
    for k, v in addon.items():
        if k == "changelog":
            continue
        ordered[k] = v
        if k == "version":
            ordered["changelog"] = addon["changelog"]
    cat["addons"][cat["addons"].index(addon)] = ordered

    cat_path.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK : {out.relative_to(ROOT)} ({len(data) // 1024} Ko), catalogue passé en {version}, {len(args.fr)} note(s).")


if __name__ == "__main__":
    main()
