const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Register .riv files so Metro bundles them as assets
config.resolver.assetExts.push("riv");

module.exports = config;
