import {
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const appName = "Lemain Spindle";
const appBundleName = "Lemain Spindle.app";
const executableName = "Lemain Spindle";

const distDir = path.join(root, "node_modules", "electron", "dist");
const electronApp = path.join(distDir, "Electron.app");
const brandedApp = path.join(distDir, appBundleName);
const pathTxt = path.join(root, "node_modules", "electron", "path.txt");
const icnsSrc = path.join(root, "resources", "icon.icns");

if (!existsSync(distDir)) {
  console.warn("[patch-electron-brand] Electron dist não encontrado — rode npm install.");
  process.exit(0);
}

if (existsSync(electronApp)) {
  if (existsSync(brandedApp)) {
    rmSync(brandedApp, { recursive: true, force: true });
  }
  renameSync(electronApp, brandedApp);
}

if (!existsSync(brandedApp)) {
  console.warn("[patch-electron-brand] Bundle do Electron não encontrado.");
  process.exit(0);
}

const contents = path.join(brandedApp, "Contents");
const macosDir = path.join(contents, "MacOS");
const plistPath = path.join(contents, "Info.plist");
const resourcesDir = path.join(contents, "Resources");
const oldBinary = path.join(macosDir, "Electron");
const newBinary = path.join(macosDir, executableName);
const icnsDst = path.join(resourcesDir, "electron.icns");

if (existsSync(oldBinary)) {
  if (existsSync(newBinary)) {
    rmSync(newBinary, { force: true });
  }
  renameSync(oldBinary, newBinary);
}

if (!existsSync(newBinary)) {
  console.warn("[patch-electron-brand] Binário do app não encontrado.");
  process.exit(0);
}

let plist = readFileSync(plistPath, "utf8");

const replaceTag = (key, value) => {
  const pattern = new RegExp(
    `(<key>${key}<\\/key>\\s*<string>)[^<]*(<\\/string>)`,
  );
  if (pattern.test(plist)) {
    plist = plist.replace(pattern, `$1${value}$2`);
  }
};

replaceTag("CFBundleDisplayName", appName);
replaceTag("CFBundleName", appName);
replaceTag("CFBundleExecutable", executableName);
replaceTag("CFBundleIconFile", "electron.icns");

writeFileSync(plistPath, plist, "utf8");

if (existsSync(icnsSrc)) {
  copyFileSync(icnsSrc, icnsDst);
}

writeFileSync(
  pathTxt,
  `${appBundleName}/Contents/MacOS/${executableName}`,
  "utf8",
);

console.log(`[patch-electron-brand] app pronto: "${appName}"`);
