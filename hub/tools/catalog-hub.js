/* Annonce une nouvelle version du hub dans le catalogue en ligne (section « hub »).
   Usage : node tools/catalog-hub.js <assets.json> <catalog.json> */
const fs = require("fs");
const [assetsFile, catalogFile] = process.argv.slice(2);
const hub = JSON.parse(fs.readFileSync(assetsFile, "utf8"));
const cat = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
cat.hub = hub;
fs.writeFileSync(catalogFile, JSON.stringify(cat, null, 2) + "\n");
console.log("catalogue : hub " + hub.version);
