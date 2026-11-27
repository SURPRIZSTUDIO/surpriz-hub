#!/bin/bash
# Installe SÜRPRIZ HÜB sur Mac, sans passer par les réglages de sécurité :
# télécharge la dernière version, vérifie son empreinte, la range dans Applications et l'ouvre.
#
#   curl -fsSL https://raw.githubusercontent.com/SURPRIZSTUDIO/surpriz-hub/main/install-mac.sh | bash
#
set -euo pipefail
CATALOG="https://raw.githubusercontent.com/SURPRIZSTUDIO/surpriz-hub/main/catalog.json"
BUNDLE_ID="com.surpriz.hub"
B=$'\033[1m'; G=$'\033[32m'; R=$'\033[31m'; N=$'\033[0m'
step() { printf '%s→%s %s\n' "$B" "$N" "$1"; }
fail() { printf '\n%s%s%s\n' "$R" "$1" "$N"; exit 1; }

[ "$(uname -s)" = "Darwin" ] || fail "Ce script est pour Mac."
printf '\n%sSÜRPRIZ HÜB%s — installation\n\n' "$B" "$N"

# Apple Silicon (M1, M2…) ou Intel
if [ "$(uname -m)" = "arm64" ] || [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then KEY="mac-arm64"; else KEY="mac-x64"; fi

step "Recherche de la dernière version"
CAT="$(curl -fsSL "$CATALOG")" || fail "Pas de connexion à Internet ? Réessaie dans un instant."
INFO="$(osascript -l JavaScript -e 'function run(a){var h=JSON.parse(a[0]).hub,x=h.assets&&h.assets[a[1]];return x?[h.version,x.url,x.sha256].join(" "):""}' "$CAT" "$KEY")"
[ -n "$INFO" ] || fail "Aucune version disponible pour ce Mac."
read -r VERSION URL SHA <<< "$INFO"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
step "Téléchargement de la version $VERSION"
curl -fL --progress-bar -o "$TMP/hub.zip" "$URL" || fail "Le téléchargement n'a pas abouti. Réessaie."
step "Vérification du fichier"
echo "$SHA  $TMP/hub.zip" | shasum -a 256 -c - >/dev/null 2>&1 || fail "Le fichier téléchargé est abîmé. Réessaie."
ditto -x -k "$TMP/hub.zip" "$TMP/app"
APP="$(find "$TMP/app" -maxdepth 1 -name '*.app' | head -n 1)"
[ -n "$APP" ] || fail "Archive incomplète."
NAME="$(basename "$APP")"

DEST="/Applications"
[ -w "$DEST" ] || { DEST="$HOME/Applications"; mkdir -p "$DEST"; }

step "Installation dans $DEST"
osascript -e "if application id \"$BUNDLE_ID\" is running then tell application id \"$BUNDLE_ID\" to quit" >/dev/null 2>&1 || true
sleep 1
if [ -e "$DEST/$NAME" ]; then
  rm -rf "$DEST/$NAME" 2>/dev/null || fail "Impossible de remplacer l'ancienne version : mets « $NAME » à la corbeille, puis relance la commande."
fi
mv "$APP" "$DEST/" || fail "Impossible de copier l'app dans $DEST."
xattr -dr com.apple.quarantine "$DEST/$NAME" 2>/dev/null || true

open "$DEST/$NAME"
printf '\n%s✓ SÜRPRIZ HÜB %s est installé.%s Il est dans %s et vient de s'"'"'ouvrir.\n' "$G" "$VERSION" "$N" "$DEST"
printf '  Les prochaines mises à jour se feront depuis le hub, en un clic.\n\n'
