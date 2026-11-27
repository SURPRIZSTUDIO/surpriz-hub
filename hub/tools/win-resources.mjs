// Pose l'icône et les informations de version sur l'exécutable Windows (sans Wine).
// Usage : node tools/win-resources.mjs <exe> <icon.ico> <version>
import fs from "fs";
import * as PE from "pe-library";
import * as ResEdit from "resedit";
const exePath = process.argv[2], icoPath = process.argv[3], version = process.argv[4];
const exe = PE.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
const res = PE.NtExecutableResource.from(exe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const gid = groups.length ? groups[0].id : 1, lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, gid, lang, ico.icons.map((i) => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
const [a, b, c] = version.split(".").map(Number);
vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, {
  FileDescription: "SÜRPRIZ HÜB", ProductName: "SÜRPRIZ HÜB", CompanyName: "Sürpriz",
  LegalCopyright: "© Sürpriz", OriginalFilename: "SURPRIZ HUB.exe", InternalName: "SURPRIZ HUB",
  FileVersion: version, ProductVersion: version
});
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
console.log("icône et version posées sur", exePath);
