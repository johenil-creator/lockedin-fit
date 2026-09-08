/**
 * Expo config plugin that sets up the LockedInFITWatch Watch App.
 *
 * Phase 1 (this plugin, runs before pod install):
 *   - Copies Watch source files from /watch into ios/
 *   - Modifies the Podfile to run injectWatchTarget.js after pod install
 *
 * Phase 2 (injectWatchTarget.js, runs after pod install via Podfile):
 *   - Injects Watch target, build configs, embed phase, etc. into pbxproj
 *   - Runs AFTER CocoaPods so changes aren't overwritten
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function withWatchApp(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const iosDir = config.modRequest.platformProjectRoot;
      const projectRoot = config.modRequest.projectRoot;

      // 1) Copy Watch source files from /watch into ios/
      const watchSrcDir = path.join(projectRoot, "watch");
      const watchAppSrc = path.join(watchSrcDir, "LockedInFITWatch Watch App");
      const watchAppDest = path.join(iosDir, "LockedInFITWatch Watch App");
      const watchSessionSrc = path.join(watchSrcDir, "WatchSession.m");
      const watchSessionDest = path.join(iosDir, "WatchSession.m");

      if (fs.existsSync(watchAppSrc)) {
        copyDirSync(watchAppSrc, watchAppDest);
        console.log("withWatchApp: Copied Watch app files to ios/");
      } else {
        console.warn("withWatchApp: watch/LockedInFITWatch Watch App not found!");
      }

      if (fs.existsSync(watchSessionSrc)) {
        fs.copyFileSync(watchSessionSrc, watchSessionDest);
        console.log("withWatchApp: Copied WatchSession.m to ios/");
      }

      // 2) Modify Podfile to inject Watch target after pod install
      const podfilePath = path.join(iosDir, "Podfile");
      if (fs.existsSync(podfilePath)) {
        let podfile = fs.readFileSync(podfilePath, "utf8");
        const injectLine = `    system('node', File.join(__dir__, '..', 'plugins', 'injectWatchTarget.js'), __dir__)`;

        if (!podfile.includes("injectWatchTarget")) {
          // Use post_integrate hook which runs AFTER CocoaPods writes all project files
          const hookBlock = `\npost_integrate do |installer|\n${injectLine}\nend\n`;
          podfile = podfile.trimEnd() + "\n" + hookBlock;

          fs.writeFileSync(podfilePath, podfile, "utf8");
          console.log("withWatchApp: Added Watch injection to Podfile post_install");
        }
      }

      return config;
    },
  ]);
}

module.exports = withWatchApp;
