/**
 * RocketSim Connect, for development on the iOS Simulator only.
 *
 * Loads RocketSim's linker framework at launch so RocketSim can stream the
 * Mac's camera into the Simulator (the stamp camera, photo capture) and
 * inspect the app. Compiled only into DEBUG Simulator builds
 * (`#if DEBUG && targetEnvironment(simulator)`), so device and release
 * builds never reference it. If RocketSim isn't installed, it logs and moves on.
 */
const { withAppDelegate } = require('@expo/config-plugins');

const MARK = '// RocketSim Connect';

const LOADER = `
${MARK}
#if DEBUG && targetEnvironment(simulator)
private func loadRocketSimConnect() {
  guard Bundle(path: "/Applications/RocketSim.app/Contents/Frameworks/RocketSimConnectLinker.nocache.framework")?.load() == true else {
    print("RocketSim Connect not loaded (is RocketSim installed?)")
    return
  }
  print("RocketSim Connect linked")
}
#endif
`;

const CALL = `
    #if DEBUG && targetEnvironment(simulator)
    loadRocketSimConnect()
    #endif
`;

module.exports = function withRocketSimConnect(config) {
  return withAppDelegate(config, (config) => {
    let src = config.modResults.contents;
    if (config.modResults.language !== 'swift' || src.includes(MARK)) return config;
    // The loader function sits at file scope, before the AppDelegate class.
    src = src.replace(/(\n@UIApplicationMain|\n@main|\npublic class AppDelegate|\nclass AppDelegate)/, `${LOADER}$1`);
    // Called first thing at launch.
    src = src.replace(/(didFinishLaunchingWithOptions launchOptions:[^)]*\)\s*->\s*Bool\s*\{)/, `$1${CALL}`);
    config.modResults.contents = src;
    return config;
  });
};
