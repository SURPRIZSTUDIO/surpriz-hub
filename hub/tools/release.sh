#!/bin/bash
# Construit SÜRPRIZ HÜB pour Mac (Apple Silicon + Intel) et Windows, signe les apps Mac (ad hoc),
# puis prépare les trois zips et leur fiche (empreintes) pour le catalogue.
# Usage : RCODESIGN=/chemin/rcodesign tools/release.sh <dossier de sortie>
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p "$1"; OUT="$(cd "$1" && pwd)"
V=$(node -p "require('./package.json').version")
NAME=$(node -p "require('./package.json').build.productName")
: "${RCODESIGN:?indique le chemin de rcodesign dans RCODESIGN}"

rm -rf dist
npx electron-builder --mac --win --publish never
for d in dist/mac-arm64 dist/mac; do "$RCODESIGN" sign "$d/$NAME.app"; done
node tools/win-resources.mjs "dist/win-unpacked/$NAME.exe" build/icon.ico "$V"

rm -f "$OUT"/Surpriz-Hub-*.zip
(cd dist/mac-arm64 && zip -qry "$OUT/Surpriz-Hub-Mac-AppleSilicon-maj-auto.zip" "$NAME.app")
(cd dist/mac && zip -qry "$OUT/Surpriz-Hub-Mac-Intel-maj-auto.zip" "$NAME.app")
mkdir -p "dist/win-zip/$NAME"
cp -a dist/win-unpacked/. "dist/win-zip/$NAME/"
sed "s/{EXE}/$NAME.exe/" tools/LISEZ-MOI-windows.txt > "dist/win-zip/$NAME/LISEZ-MOI.txt"
(cd dist/win-zip && zip -qr "$OUT/Surpriz-Hub-Windows.zip" "$NAME")
node tools/assets.js "$OUT" "$V" > "$OUT/assets.json"
echo "SÜRPRIZ HÜB $V prêt dans $OUT"
