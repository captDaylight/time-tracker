// electron-builder afterPack hook: ad-hoc code-sign the macOS .app.
//
// We don't have an Apple Developer certificate, so CI builds with
// CSC_IDENTITY_AUTODISCOVERY=false (no real signing). Without ANY signature,
// Apple Silicon macOS marks the downloaded app as "damaged" and refuses to
// open it with no escape hatch. An ad-hoc signature ("-") fixes that: Gatekeeper
// instead shows the softer "Apple can't verify" prompt, and the app opens via
// right-click -> Open (or after `xattr -dr com.apple.quarantine <app>`).
//
// This runs after the bundle is fully assembled but before the dmg is built,
// so the signed bundle is what gets packaged.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`[afterPack] ad-hoc signing ${appPath}`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], {
    stdio: "inherit",
  });
};
