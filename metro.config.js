const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration for React Native
 * Optimized for macOS file watching (EMFILE prevention)
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  maxWorkers: 2,
  resolver: {
    useWatchman: true,
  },
};

module.exports = mergeConfig(defaultConfig, config);
