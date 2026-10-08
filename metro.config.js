const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow `require('../assets/models/ggml-base.en.bin')` to be bundled as a
// binary asset (needed for the on-device Whisper model used by voice chat).
config.resolver.assetExts = [...config.resolver.assetExts, 'bin'];

module.exports = config;
