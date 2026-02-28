const {
  withDangerousMod,
  withInfoPlist,
  withEntitlementsPlist,
  withXcodeProject,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ICON_MOODS = [
  "icon_focused",
  "icon_motivated",
  "icon_mischievous",
  "icon_disappointed",
];

// Map mood name -> Xcode asset set name
function assetSetName(mood) {
  const suffix = mood.replace("icon_", "");
  return "Icon" + suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

/**
 * Pad a PNG to 1024x1024 centered on #0D1117 background using sips + Python.
 * Only runs if the image isn't already 1024x1024 at 72 DPI.
 */
function ensureIcon1024(pngPath) {
  if (!fs.existsSync(pngPath)) return;
  const info = execSync(`sips -g pixelWidth -g pixelHeight -g dpiWidth "${pngPath}"`, {
    encoding: "utf8",
  });
  const w = parseInt(info.match(/pixelWidth:\s*(\d+)/)?.[1] || "0");
  const h = parseInt(info.match(/pixelHeight:\s*(\d+)/)?.[1] || "0");
  const dpi = parseFloat(info.match(/dpiWidth:\s*([\d.]+)/)?.[1] || "72");
  if (w === 1024 && h === 1024 && Math.abs(dpi - 72) < 1) return;

  console.log(`  [withAlternateIcons] Padding ${path.basename(pngPath)} (${w}x${h} @${dpi}dpi) -> 1024x1024 @72dpi`);
  execSync(
    `/usr/bin/python3 -c "
from PIL import Image
fg = Image.open('${pngPath}').convert('RGBA')
w, h = fg.size
BG = (0x0D, 0x11, 0x17, 255)
canvas = Image.new('RGBA', (1024, 1024), BG)
if w > 900 or h > 900:
    pixels = fg.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a > 10 and not (r == 0x0D and g == 0x11 and b == 0x17):
                min_x, min_y = min(min_x, x), min(min_y, y)
                max_x, max_y = max(max_x, x), max(max_y, y)
    if max_x > min_x and max_y > min_y:
        content = fg.crop((min_x, min_y, max_x + 1, max_y + 1))
        cw, ch = content.size
        canvas.paste(content, ((1024-cw)//2, (1024-ch)//2), content)
    else:
        canvas.paste(fg, ((1024-w)//2, (1024-h)//2), fg)
else:
    canvas.paste(fg, ((1024-w)//2, (1024-h)//2), fg)
canvas.save('${pngPath}', dpi=(72, 72))
"`,
    { encoding: "utf8" }
  );
}

// 1. Add alternate icon image sets to xcassets
const withAlternateIconAssets = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const xcassetsDir = path.join(
        projectRoot,
        "ios",
        config.modRequest.projectName,
        "Images.xcassets"
      );
      const iconsSrc = path.join(projectRoot, "assets", "icons");

      // Ensure source icons are 1024x1024
      for (const fname of fs.readdirSync(iconsSrc)) {
        if (fname.endsWith(".png")) {
          ensureIcon1024(path.join(iconsSrc, fname));
        }
      }

      // Also ensure main icon sources
      const mainIcon = path.join(projectRoot, "assets", "icon.png");
      const adaptiveIcon = path.join(projectRoot, "assets", "adaptive-icon.png");
      if (fs.existsSync(mainIcon)) ensureIcon1024(mainIcon);
      if (fs.existsSync(adaptiveIcon)) ensureIcon1024(adaptiveIcon);

      // Create alternate icon asset sets
      for (const mood of ICON_MOODS) {
        const setName = assetSetName(mood);
        const setDir = path.join(xcassetsDir, `${setName}.appiconset`);
        const srcPng = path.join(iconsSrc, `${mood}.png`);

        if (!fs.existsSync(srcPng)) {
          console.warn(`  [withAlternateIcons] Missing ${mood}.png, skipping`);
          continue;
        }

        fs.mkdirSync(setDir, { recursive: true });
        fs.copyFileSync(srcPng, path.join(setDir, `${mood}.png`));
        fs.writeFileSync(
          path.join(setDir, "Contents.json"),
          JSON.stringify(
            {
              images: [
                {
                  filename: `${mood}.png`,
                  idiom: "universal",
                  platform: "ios",
                  size: "1024x1024",
                },
              ],
              info: { version: 1, author: "expo" },
            },
            null,
            2
          )
        );
        console.log(`  [withAlternateIcons] Added ${setName} icon set`);
      }

      // Write the AppIconModule.m native module
      const nativeDir = path.join(
        projectRoot,
        "ios",
        config.modRequest.projectName
      );
      const modulePath = path.join(nativeDir, "AppIconModule.m");
      fs.writeFileSync(
        modulePath,
        `#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface AppIconModule : NSObject <RCTBridgeModule>
@end

@implementation AppIconModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setIcon:(NSString *)iconName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *name = [iconName isKindOfClass:[NSNull class]] ? nil : iconName;
    [[UIApplication sharedApplication] setAlternateIconName:name
                                         completionHandler:^(NSError * _Nullable error) {
      if (error) {
        reject(@"ICON_ERROR", error.localizedDescription, error);
      } else {
        resolve(nil);
      }
    }];
  });
}

@end
`
      );
      console.log("  [withAlternateIcons] Added AppIconModule.m");

      return config;
    },
  ]);
};

// 2. Add AppIconModule.m to Xcode project sources
const withAppIconXcodeProject = (config) => {
  return withXcodeProject(config, (config) => {
    const proj = config.modResults;
    const projectName = config.modRequest.projectName;
    const fileName = "AppIconModule.m";
    const filePath = `${projectName}/${fileName}`;

    // Check if already added
    const existingFile = proj.pbxFileReferenceSection();
    const alreadyAdded = Object.values(existingFile).some(
      (f) => typeof f === "object" && f.name === fileName
    );
    if (!alreadyAdded) {
      // Find the main source group for the project
      const mainGroup = proj.getFirstProject().firstProject.mainGroup;
      const groups = proj.getPBXGroupByKey(mainGroup);
      let targetGroup = mainGroup;
      if (groups && groups.children) {
        const appGroup = groups.children.find(
          (c) => c.comment === projectName
        );
        if (appGroup) targetGroup = appGroup.value;
      }

      proj.addSourceFile(filePath, { target: proj.getFirstTarget().uuid }, targetGroup);
      console.log("  [withAlternateIcons] Added AppIconModule.m to Xcode project");
    }
    return config;
  });
};

// 3. Add CFBundleAlternateIcons to Info.plist
const withAlternateIconsPlist = (config) => {
  return withInfoPlist(config, (config) => {
    const alternateIcons = {};
    for (const mood of ICON_MOODS) {
      alternateIcons[mood] = {
        CFBundleIconFiles: [assetSetName(mood)],
      };
    }
    config.modResults.CFBundleIcons = {
      CFBundlePrimaryIcon: {
        CFBundleIconFiles: ["AppIcon"],
      },
      CFBundleAlternateIcons: alternateIcons,
    };
    console.log("  [withAlternateIcons] Added CFBundleAlternateIcons to Info.plist");
    return config;
  });
};

// 4. Remove aps-environment from entitlements (not supported on personal teams)
const withFixedEntitlements = (config) => {
  return withEntitlementsPlist(config, (config) => {
    if (config.modResults["aps-environment"]) {
      delete config.modResults["aps-environment"];
      console.log("  [withAlternateIcons] Removed aps-environment entitlement");
    }
    return config;
  });
};

// Compose all mods
module.exports = function withAlternateIcons(config) {
  config = withAlternateIconAssets(config);
  config = withAppIconXcodeProject(config);
  config = withAlternateIconsPlist(config);
  config = withFixedEntitlements(config);
  return config;
};
