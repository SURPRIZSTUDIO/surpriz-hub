#!/usr/bin/env python3
"""Fabrique le disque d'installation Mac (.dmg) de SÜRPRIZ HÜB : l'app, un raccourci vers Applications
et le fond qui explique la marche à suivre. À lancer sur un Mac (hdiutil).

Usage : python3 tools/make_dmg.py "<chemin de SURPRIZ HUB.app>" <sortie.dmg>

Contourne un défaut de mac_alias sur les Mac récents (identifiants de dossiers sur 64 bits dans l'alias
de l'image de fond) : seuls les identifiants valides sont gardés, le Finder retrouve l'image par son chemin."""
import os, sys, pathlib
import mac_alias, dmgbuild

_to_bytes = mac_alias.Alias.to_bytes
def _safe_to_bytes(self):
    t = self.target
    if getattr(t, "cnid_path", None):
        t.cnid_path = [c for c in t.cnid_path if 0 <= c <= 0xFFFFFFFF]
    return _to_bytes(self)
mac_alias.Alias.to_bytes = _safe_to_bytes

HUB = pathlib.Path(__file__).resolve().parent.parent
app, out = sys.argv[1], sys.argv[2]
name = os.path.basename(app)
settings = {
    "format": "UDZO",
    "filesystem": "HFS+",
    "files": [app],
    "symlinks": {"Applications": "/Applications"},
    "icon_locations": {name: (160, 190), "Applications": (480, 190)},
    "background": str(HUB / "build" / "dmg" / "background.png"),  # background@2x.png est repris automatiquement
    "window_rect": ((200, 120), (640, 468)),  # 440 de fond + la barre de titre du Finder
    "default_view": "icon-view",
    "icon_size": 96,
    "text_size": 12,
    "show_status_bar": False, "show_tab_view": False, "show_toolbar": False, "show_pathbar": False, "show_sidebar": False,
    "arrange_by": None,
    "include_icon_view_settings": True,
}
dmgbuild.build_dmg(out, "SÜRPRIZ HÜB", settings=settings)
print("dmg :", out)
