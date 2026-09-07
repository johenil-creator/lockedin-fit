/**
 * Expo config plugin that injects the LockedInFITWatch Watch App target
 * into the prebuild-generated Xcode project.
 *
 * Watch source files live in /watch (outside ios/) so they survive
 * `expo prebuild --clean`. This plugin copies them into ios/ and then
 * injects the Watch target, build configurations, "Embed Watch Content"
 * copy phase, WatchSession.m, and WatchConnectivity + HealthKit frameworks.
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

// Stable UUIDs reused from the hand-crafted LockedInFITDev.xcodeproj so that
// code-signing entitlements, provisioning profiles, etc. stay consistent.
const IDS = {
  watchApp: "E10CA0273043E53D00A2E0D1",
  watchAppTarget: "E10CA0263043E53D00A2E0D1",
  watchSources: "E10CA0233043E53D00A2E0D1",
  watchFrameworks: "E10CA0243043E53D00A2E0D1",
  watchResources: "E10CA0253043E53D00A2E0D1",
  watchGroup: "E10CA0283043E53D00A2E0D1",
  watchConfigList: "E10CA04F3043E54100A2E0D1",
  watchDebugConfig: "E10CA0493043E54100A2E0D1",
  watchReleaseConfig: "E10CA04A3043E54100A2E0D1",
  embedPhase: "E10CA0483043E54100A2E0D1",
  embedBuildFile: "E10CA0473043E54100A2E0D1",
  containerProxy: "E10CA0343043E54100A2E0D1",
  targetDependency: "E10CA0463043E54100A2E0D1",
  watchSessionFile: "E10CA0593043E71F00A2E0D1",
  watchSessionBuild: "E10CA05B3043E71F00A2E0D1",
  wcFrameworkIos: "E10CA05D3043E82200A2E0D1",
  wcFrameworkIosBuild: "E10CA05E3043E82200A2E0D1",
  wcFrameworkWatch: "E10CA05F3043E87400A2E0D1",
  wcFrameworkWatchBuild: "E10CA0603043E87400A2E0D1",
  hkFrameworkWatch: "E10CA0613043E90000A2E0D1",
  hkFrameworkWatchBuild: "E10CA0623043E90000A2E0D1",
};

function insertAfter(source, marker, content) {
  const idx = source.indexOf(marker);
  if (idx === -1) throw new Error(`withWatchApp: marker not found: ${marker}`);
  const end = idx + marker.length;
  return source.slice(0, end) + content + source.slice(end);
}

function insertBefore(source, marker, content) {
  const idx = source.indexOf(marker);
  if (idx === -1) throw new Error(`withWatchApp: marker not found: ${marker}`);
  return source.slice(0, idx) + content + source.slice(idx);
}

function withWatchApp(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const iosDir = config.modRequest.platformProjectRoot;
      const pbxprojPath = path.join(
        iosDir,
        "LockedInFIT.xcodeproj",
        "project.pbxproj"
      );

      if (!fs.existsSync(pbxprojPath)) {
        console.warn("withWatchApp: pbxproj not found, skipping");
        return config;
      }

      // Copy Watch source files from /watch into ios/
      const projectRoot = config.modRequest.projectRoot;
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

      let pbx = fs.readFileSync(pbxprojPath, "utf8");

      // Skip if already injected
      if (pbx.includes("LockedInFITWatch Watch App")) {
        console.log("withWatchApp: Watch target already present, skipping");
        return config;
      }

      const isDev =
        process.env.APP_VARIANT === "development";
      const mainBundleId = isDev
        ? "com.johenilhernandez.LockedInFit.dev"
        : "com.johenilhernandez.LockedInFit";
      const watchBundleId = mainBundleId + ".watchkitapp";

      // 1) Bump objectVersion to 70 (required for PBXFileSystemSynchronizedRootGroup)
      pbx = pbx.replace(/objectVersion = \d+;/, "objectVersion = 70;");

      // 2) Add PBXBuildFile entries
      pbx = insertBefore(
        pbx,
        "/* End PBXBuildFile section */",
        `\t\t${IDS.embedBuildFile} /* LockedInFITWatch Watch App.app in Embed Watch Content */ = {isa = PBXBuildFile; fileRef = ${IDS.watchApp} /* LockedInFITWatch Watch App.app */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };\n` +
          `\t\t${IDS.watchSessionBuild} /* WatchSession.m in Sources */ = {isa = PBXBuildFile; fileRef = ${IDS.watchSessionFile} /* WatchSession.m */; };\n` +
          `\t\t${IDS.wcFrameworkIosBuild} /* WatchConnectivity.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = ${IDS.wcFrameworkIos} /* WatchConnectivity.framework */; };\n` +
          `\t\t${IDS.wcFrameworkWatchBuild} /* WatchConnectivity.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = ${IDS.wcFrameworkWatch} /* WatchConnectivity.framework */; };\n` +
          `\t\t${IDS.hkFrameworkWatchBuild} /* HealthKit.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = ${IDS.hkFrameworkWatch} /* HealthKit.framework */; };\n`
      );

      // 3) Add PBXContainerItemProxy section (before PBXCopyFiles or PBXFileReference)
      const containerProxySection =
        `/* Begin PBXContainerItemProxy section */\n` +
        `\t\t${IDS.containerProxy} /* PBXContainerItemProxy */ = {\n` +
        `\t\t\tisa = PBXContainerItemProxy;\n` +
        `\t\t\tcontainerPortal = 83CBB9F71A601CBA00E9B192 /* Project object */;\n` +
        `\t\t\tproxyType = 1;\n` +
        `\t\t\tremoteGlobalIDString = ${IDS.watchAppTarget};\n` +
        `\t\t\tremoteInfo = "LockedInFITWatch Watch App";\n` +
        `\t\t};\n` +
        `/* End PBXContainerItemProxy section */\n\n`;
      pbx = insertBefore(pbx, "/* Begin PBXFileReference section */", containerProxySection);

      // 4) Add PBXCopyFilesBuildPhase (Embed Watch Content)
      const copyFilesSection =
        `/* Begin PBXCopyFilesBuildPhase section */\n` +
        `\t\t${IDS.embedPhase} /* Embed Watch Content */ = {\n` +
        `\t\t\tisa = PBXCopyFilesBuildPhase;\n` +
        `\t\t\tbuildActionMask = 2147483647;\n` +
        `\t\t\tdstPath = "$(CONTENTS_FOLDER_PATH)/Watch";\n` +
        `\t\t\tdstSubfolderSpec = 16;\n` +
        `\t\t\tfiles = (\n` +
        `\t\t\t\t${IDS.embedBuildFile} /* LockedInFITWatch Watch App.app in Embed Watch Content */,\n` +
        `\t\t\t);\n` +
        `\t\t\tname = "Embed Watch Content";\n` +
        `\t\t\trunOnlyForDeploymentPostprocessing = 0;\n` +
        `\t\t};\n` +
        `/* End PBXCopyFilesBuildPhase section */\n\n`;
      pbx = insertBefore(pbx, "/* Begin PBXFileReference section */", copyFilesSection);

      // 5) Add PBXFileReference entries
      pbx = insertBefore(
        pbx,
        "/* End PBXFileReference section */",
        `\t\t${IDS.watchApp} /* LockedInFITWatch Watch App.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "LockedInFITWatch Watch App.app"; sourceTree = BUILT_PRODUCTS_DIR; };\n` +
          `\t\t${IDS.watchSessionFile} /* WatchSession.m */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; path = WatchSession.m; sourceTree = "<group>"; };\n` +
          `\t\t${IDS.wcFrameworkIos} /* WatchConnectivity.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = WatchConnectivity.framework; path = System/Library/Frameworks/WatchConnectivity.framework; sourceTree = SDKROOT; };\n` +
          `\t\t${IDS.wcFrameworkWatch} /* WatchConnectivity.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = WatchConnectivity.framework; path = Platforms/WatchOS.platform/Developer/SDKs/WatchOS.sdk/System/Library/Frameworks/WatchConnectivity.framework; sourceTree = DEVELOPER_DIR; };\n` +
          `\t\t${IDS.hkFrameworkWatch} /* HealthKit.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = HealthKit.framework; path = Platforms/WatchOS.platform/Developer/SDKs/WatchOS.sdk/System/Library/Frameworks/HealthKit.framework; sourceTree = DEVELOPER_DIR; };\n`
      );

      // 6) Add PBXFileSystemSynchronizedRootGroup section
      const fsSyncSection =
        `/* Begin PBXFileSystemSynchronizedRootGroup section */\n` +
        `\t\t${IDS.watchGroup} /* LockedInFITWatch Watch App */ = {isa = PBXFileSystemSynchronizedRootGroup; explicitFileTypes = {}; explicitFolders = (); path = "LockedInFITWatch Watch App"; sourceTree = "<group>"; };\n` +
        `/* End PBXFileSystemSynchronizedRootGroup section */\n\n`;
      pbx = insertBefore(pbx, "/* Begin PBXFrameworksBuildPhase section */", fsSyncSection);

      // 7) Add WatchConnectivity to main target's Frameworks phase
      pbx = pbx.replace(
        /(\t\t13B07F8C1A680F5B00A75B9A \/\* Frameworks \*\/ = \{[^}]*files = \(\n)/,
        `$1\t\t\t\t${IDS.wcFrameworkIosBuild} /* WatchConnectivity.framework in Frameworks */,\n`
      );

      // 8) Add Watch Frameworks build phase
      pbx = insertBefore(
        pbx,
        "/* End PBXFrameworksBuildPhase section */",
        `\t\t${IDS.watchFrameworks} /* Frameworks */ = {\n` +
          `\t\t\tisa = PBXFrameworksBuildPhase;\n` +
          `\t\t\tbuildActionMask = 2147483647;\n` +
          `\t\t\tfiles = (\n` +
          `\t\t\t\t${IDS.wcFrameworkWatchBuild} /* WatchConnectivity.framework in Frameworks */,\n` +
          `\t\t\t\t${IDS.hkFrameworkWatchBuild} /* HealthKit.framework in Frameworks */,\n` +
          `\t\t\t);\n` +
          `\t\t\trunOnlyForDeploymentPostprocessing = 0;\n` +
          `\t\t};\n`
      );

      // 9) Add Watch app product to Products group, Watch group + WatchSession.m to main group, frameworks to Frameworks group
      // Products group
      pbx = pbx.replace(
        /(83CBBA001A601CBA00E9B192 \/\* Products \*\/ = \{\s*isa = PBXGroup;\s*children = \(\n)/,
        `$1\t\t\t\t${IDS.watchApp} /* LockedInFITWatch Watch App.app */,\n`
      );

      // Main group — add WatchSession.m and Watch group
      pbx = pbx.replace(
        /(83CBB9F61A601CBA00E9B192 = \{\s*isa = PBXGroup;\s*children = \(\n)/,
        `$1\t\t\t\t${IDS.watchSessionFile} /* WatchSession.m */,\n\t\t\t\t${IDS.watchGroup} /* LockedInFITWatch Watch App */,\n`
      );

      // Frameworks group — add WatchConnectivity + HealthKit
      pbx = pbx.replace(
        /(2D16E6871FA4F8E400B85C8A \/\* Frameworks \*\/ = \{\s*isa = PBXGroup;\s*children = \(\n)/,
        `$1\t\t\t\t${IDS.wcFrameworkIos} /* WatchConnectivity.framework */,\n\t\t\t\t${IDS.wcFrameworkWatch} /* WatchConnectivity.framework */,\n\t\t\t\t${IDS.hkFrameworkWatch} /* HealthKit.framework */,\n`
      );

      // 10) Add Watch native target
      pbx = insertBefore(
        pbx,
        "/* End PBXNativeTarget section */",
        `\t\t${IDS.watchAppTarget} /* LockedInFITWatch Watch App */ = {\n` +
          `\t\t\tisa = PBXNativeTarget;\n` +
          `\t\t\tbuildConfigurationList = ${IDS.watchConfigList} /* Build configuration list for PBXNativeTarget "LockedInFITWatch Watch App" */;\n` +
          `\t\t\tbuildPhases = (\n` +
          `\t\t\t\t${IDS.watchSources} /* Sources */,\n` +
          `\t\t\t\t${IDS.watchFrameworks} /* Frameworks */,\n` +
          `\t\t\t\t${IDS.watchResources} /* Resources */,\n` +
          `\t\t\t);\n` +
          `\t\t\tbuildRules = (\n` +
          `\t\t\t);\n` +
          `\t\t\tdependencies = (\n` +
          `\t\t\t);\n` +
          `\t\t\tfileSystemSynchronizedGroups = (\n` +
          `\t\t\t\t${IDS.watchGroup} /* LockedInFITWatch Watch App */,\n` +
          `\t\t\t);\n` +
          `\t\t\tname = "LockedInFITWatch Watch App";\n` +
          `\t\t\tpackageProductDependencies = (\n` +
          `\t\t\t);\n` +
          `\t\t\tproductName = "LockedInFITWatch Watch App";\n` +
          `\t\t\tproductReference = ${IDS.watchApp} /* LockedInFITWatch Watch App.app */;\n` +
          `\t\t\tproductType = "com.apple.product-type.application";\n` +
          `\t\t};\n`
      );

      // 11) Add Watch target dependency to main target
      // Add PBXTargetDependency section
      const targetDepSection =
        `/* Begin PBXTargetDependency section */\n` +
        `\t\t${IDS.targetDependency} /* PBXTargetDependency */ = {\n` +
        `\t\t\tisa = PBXTargetDependency;\n` +
        `\t\t\ttarget = ${IDS.watchAppTarget} /* LockedInFITWatch Watch App */;\n` +
        `\t\t\ttargetProxy = ${IDS.containerProxy} /* PBXContainerItemProxy */;\n` +
        `\t\t};\n` +
        `/* End PBXTargetDependency section */\n\n`;
      pbx = insertBefore(pbx, "/* Begin XCBuildConfiguration section */", targetDepSection);

      // Add dependency + embed phase to main target's build phases and dependencies
      pbx = pbx.replace(
        /(13B07F861A680F5B00A75B9A \/\* LockedInFIT \*\/ = \{[^}]*?dependencies = \(\n)/,
        `$1\t\t\t\t${IDS.targetDependency} /* PBXTargetDependency */,\n`
      );

      // Add Embed Watch Content phase to main target's buildPhases
      pbx = pbx.replace(
        /(\[CP-User\] \[RNGoogleMobileAds\] Configuration \*\/,\n)/,
        `$1\t\t\t\t${IDS.embedPhase} /* Embed Watch Content */,\n`
      );

      // 12) Add WatchSession.m to main target Sources phase
      pbx = pbx.replace(
        /(13B07F871A680F5B00A75B9A \/\* Sources \*\/ = \{[^}]*files = \(\n)/,
        `$1\t\t\t\t${IDS.watchSessionBuild} /* WatchSession.m in Sources */,\n`
      );

      // 13) Add Watch Sources and Resources build phases (empty, files come from fileSystemSynchronizedGroups)
      pbx = insertBefore(
        pbx,
        "/* End PBXResourcesBuildPhase section */",
        `\t\t${IDS.watchResources} /* Resources */ = {\n` +
          `\t\t\tisa = PBXResourcesBuildPhase;\n` +
          `\t\t\tbuildActionMask = 2147483647;\n` +
          `\t\t\tfiles = (\n` +
          `\t\t\t);\n` +
          `\t\t\trunOnlyForDeploymentPostprocessing = 0;\n` +
          `\t\t};\n`
      );

      pbx = insertBefore(
        pbx,
        "/* End PBXSourcesBuildPhase section */",
        `\t\t${IDS.watchSources} /* Sources */ = {\n` +
          `\t\t\tisa = PBXSourcesBuildPhase;\n` +
          `\t\t\tbuildActionMask = 2147483647;\n` +
          `\t\t\tfiles = (\n` +
          `\t\t\t);\n` +
          `\t\t\trunOnlyForDeploymentPostprocessing = 0;\n` +
          `\t\t};\n`
      );

      // 14) Add Watch target to project targets list
      pbx = pbx.replace(
        /(targets = \(\n\t\t\t\t13B07F861A680F5B00A75B9A \/\* LockedInFIT \*\/,\n)/,
        `$1\t\t\t\t${IDS.watchAppTarget} /* LockedInFITWatch Watch App */,\n`
      );

      // Add TargetAttributes for Watch
      pbx = pbx.replace(
        /(TargetAttributes = \{[^}]*?\n\t\t\t\t\};)/s,
        `TargetAttributes = {\n` +
          `\t\t\t\t\t13B07F861A680F5B00A75B9A = {\n` +
          `\t\t\t\t\t\tLastSwiftMigration = 1250;\n` +
          `\t\t\t\t\t};\n` +
          `\t\t\t\t\t${IDS.watchAppTarget} = {\n` +
          `\t\t\t\t\t\tCreatedOnToolsVersion = 26.6;\n` +
          `\t\t\t\t\t};\n` +
          `\t\t\t\t};`
      );

      // 15) Add Watch build configurations
      const watchDebugConfig =
        `\t\t${IDS.watchDebugConfig} /* Debug */ = {\n` +
        `\t\t\tisa = XCBuildConfiguration;\n` +
        `\t\t\tbuildSettings = {\n` +
        `\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n` +
        `\t\t\t\tASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;\n` +
        `\t\t\t\tASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;\n` +
        `\t\t\t\tCLANG_ANALYZER_NONNULL = YES;\n` +
        `\t\t\t\tCLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;\n` +
        `\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";\n` +
        `\t\t\t\tCLANG_ENABLE_OBJC_WEAK = YES;\n` +
        `\t\t\t\tCLANG_WARN_DOCUMENTATION_COMMENTS = YES;\n` +
        `\t\t\t\tCLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;\n` +
        `\t\t\t\tCLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;\n` +
        `\t\t\t\tCODE_SIGN_ENTITLEMENTS = "LockedInFITWatch Watch App/LockedInFITWatch.entitlements";\n` +
        `\t\t\t\tCODE_SIGN_STYLE = Automatic;\n` +
        `\t\t\t\tDEVELOPMENT_TEAM = S2NN9SCTYQ;\n` +
        `\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n` +
        `\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;\n` +
        `\t\t\t\tENABLE_PREVIEWS = YES;\n` +
        `\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = YES;\n` +
        `\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;\n` +
        `\t\t\t\tGENERATE_INFOPLIST_FILE = YES;\n` +
        `\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = LockedInFIT;\n` +
        `\t\t\t\tINFOPLIST_KEY_NSHealthShareUsageDescription = "LockedInFIT uses HealthKit to keep your workout session active on Apple Watch, contribute to Activity Rings, and track workout duration.";\n` +
        `\t\t\t\tINFOPLIST_KEY_NSHealthUpdateUsageDescription = "LockedInFIT saves your workout sessions to Apple Health so they appear in your Activity Rings and workout history.";\n` +
        `\t\t\t\tINFOPLIST_KEY_NSMotionUsageDescription = "LockedInFIT uses motion data to track your steps and distance during walking and running sessions on Apple Watch.";\n` +
        `\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown";\n` +
        `\t\t\t\tINFOPLIST_KEY_WKCompanionAppBundleIdentifier = "${mainBundleId}";\n` +
        `\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n` +
        `\t\t\t\t\t"$(inherited)",\n` +
        `\t\t\t\t\t"@executable_path/Frameworks",\n` +
        `\t\t\t\t);\n` +
        `\t\t\t\tLOCALIZATION_PREFERS_STRING_CATALOGS = YES;\n` +
        `\t\t\t\tMARKETING_VERSION = 2.3.1;\n` +
        `\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;\n` +
        `\t\t\t\tMTL_FAST_MATH = YES;\n` +
        `\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = "${watchBundleId}";\n` +
        `\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";\n` +
        `\t\t\t\tSDKROOT = watchos;\n` +
        `\t\t\t\tSKIP_INSTALL = YES;\n` +
        `\t\t\t\tSTRING_CATALOG_GENERATE_SYMBOLS = YES;\n` +
        `\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";\n` +
        `\t\t\t\tSWIFT_APPROACHABLE_CONCURRENCY = YES;\n` +
        `\t\t\t\tSWIFT_DEFAULT_ACTOR_ISOLATION = MainActor;\n` +
        `\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;\n` +
        `\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";\n` +
        `\t\t\t\tSWIFT_UPCOMING_FEATURE_MEMBER_IMPORT_VISIBILITY = YES;\n` +
        `\t\t\t\tSWIFT_VERSION = 5.0;\n` +
        `\t\t\t\tTARGETED_DEVICE_FAMILY = 4;\n` +
        `\t\t\t\tWATCHOS_DEPLOYMENT_TARGET = 26.0;\n` +
        `\t\t\t};\n` +
        `\t\t\tname = Debug;\n` +
        `\t\t};\n`;

      const watchReleaseConfig =
        `\t\t${IDS.watchReleaseConfig} /* Release */ = {\n` +
        `\t\t\tisa = XCBuildConfiguration;\n` +
        `\t\t\tbuildSettings = {\n` +
        `\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n` +
        `\t\t\t\tASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;\n` +
        `\t\t\t\tASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;\n` +
        `\t\t\t\tCLANG_ANALYZER_NONNULL = YES;\n` +
        `\t\t\t\tCLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;\n` +
        `\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";\n` +
        `\t\t\t\tCLANG_ENABLE_OBJC_WEAK = YES;\n` +
        `\t\t\t\tCLANG_WARN_DOCUMENTATION_COMMENTS = YES;\n` +
        `\t\t\t\tCLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;\n` +
        `\t\t\t\tCLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;\n` +
        `\t\t\t\tCODE_SIGN_ENTITLEMENTS = "LockedInFITWatch Watch App/LockedInFITWatch.entitlements";\n` +
        `\t\t\t\tCODE_SIGN_STYLE = Automatic;\n` +
        `\t\t\t\tDEVELOPMENT_TEAM = S2NN9SCTYQ;\n` +
        `\t\t\t\tCOPY_PHASE_STRIP = NO;\n` +
        `\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n` +
        `\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";\n` +
        `\t\t\t\tENABLE_PREVIEWS = YES;\n` +
        `\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = YES;\n` +
        `\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;\n` +
        `\t\t\t\tGENERATE_INFOPLIST_FILE = YES;\n` +
        `\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = LockedInFIT;\n` +
        `\t\t\t\tINFOPLIST_KEY_NSHealthShareUsageDescription = "LockedInFIT uses HealthKit to keep your workout session active on Apple Watch, contribute to Activity Rings, and track workout duration.";\n` +
        `\t\t\t\tINFOPLIST_KEY_NSHealthUpdateUsageDescription = "LockedInFIT saves your workout sessions to Apple Health so they appear in your Activity Rings and workout history.";\n` +
        `\t\t\t\tINFOPLIST_KEY_NSMotionUsageDescription = "LockedInFIT uses motion data to track your steps and distance during walking and running sessions on Apple Watch.";\n` +
        `\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown";\n` +
        `\t\t\t\tINFOPLIST_KEY_WKCompanionAppBundleIdentifier = "${mainBundleId}";\n` +
        `\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n` +
        `\t\t\t\t\t"$(inherited)",\n` +
        `\t\t\t\t\t"@executable_path/Frameworks",\n` +
        `\t\t\t\t);\n` +
        `\t\t\t\tLOCALIZATION_PREFERS_STRING_CATALOGS = YES;\n` +
        `\t\t\t\tMARKETING_VERSION = 2.3.1;\n` +
        `\t\t\t\tMTL_FAST_MATH = YES;\n` +
        `\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = "${watchBundleId}";\n` +
        `\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";\n` +
        `\t\t\t\tSDKROOT = watchos;\n` +
        `\t\t\t\tSKIP_INSTALL = YES;\n` +
        `\t\t\t\tSTRING_CATALOG_GENERATE_SYMBOLS = YES;\n` +
        `\t\t\t\tSWIFT_APPROACHABLE_CONCURRENCY = YES;\n` +
        `\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;\n` +
        `\t\t\t\tSWIFT_DEFAULT_ACTOR_ISOLATION = MainActor;\n` +
        `\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;\n` +
        `\t\t\t\tSWIFT_UPCOMING_FEATURE_MEMBER_IMPORT_VISIBILITY = YES;\n` +
        `\t\t\t\tSWIFT_VERSION = 5.0;\n` +
        `\t\t\t\tTARGETED_DEVICE_FAMILY = 4;\n` +
        `\t\t\t\tWATCHOS_DEPLOYMENT_TARGET = 26.0;\n` +
        `\t\t\t};\n` +
        `\t\t\tname = Release;\n` +
        `\t\t};\n`;

      pbx = insertBefore(
        pbx,
        "/* End XCBuildConfiguration section */",
        watchDebugConfig + watchReleaseConfig
      );

      // 16) Add Watch XCConfigurationList
      pbx = insertBefore(
        pbx,
        "/* End XCConfigurationList section */",
        `\t\t${IDS.watchConfigList} /* Build configuration list for PBXNativeTarget "LockedInFITWatch Watch App" */ = {\n` +
          `\t\t\tisa = XCConfigurationList;\n` +
          `\t\t\tbuildConfigurations = (\n` +
          `\t\t\t\t${IDS.watchDebugConfig} /* Debug */,\n` +
          `\t\t\t\t${IDS.watchReleaseConfig} /* Release */,\n` +
          `\t\t\t);\n` +
          `\t\t\tdefaultConfigurationIsVisible = 0;\n` +
          `\t\t\tdefaultConfigurationName = Release;\n` +
          `\t\t};\n`
      );

      fs.writeFileSync(pbxprojPath, pbx, "utf8");
      console.log("withWatchApp: Watch target injected successfully");

      return config;
    },
  ]);
}

module.exports = withWatchApp;
