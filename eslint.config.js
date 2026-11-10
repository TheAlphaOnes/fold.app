// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // The live camera must go through CameraSurface (src/components/camera/camera-surface.tsx),
    // which isolates it in its own native container; a bare CameraView next to other views
    // crashes the app when its screen closes under a streamed simulator camera.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/camera/camera-surface.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='CameraView']",
          message: "Render the camera with <CameraSurface> (src/components/camera/camera-surface.tsx), not a bare <CameraView>.",
        },
      ],
    },
  },
]);
