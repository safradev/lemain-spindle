const { existsSync } = require("node:fs");
const path = require("node:path");

exports.default = async function ensureCoreResources(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const coreDir = path.join(context.appOutDir, "resources", "core");
  const exePath = path.join(coreDir, "spindle-core.exe");
  const runtimeDir = path.join(coreDir, "runtime");

  if (!existsSync(exePath)) {
    throw new Error(`[afterPack] Missing bundled core: ${exePath}`);
  }
  if (!existsSync(runtimeDir)) {
    throw new Error(`[afterPack] Missing core runtime directory: ${runtimeDir}`);
  }

  console.log(`[afterPack] core package ok at ${coreDir}`);
};
