const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withPasteInputFix = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // Find ExpoPasteInputView.kt inside node_modules
      const filePaths = [
        path.join(config.modRequest.projectRoot, 'node_modules', 'expo-paste-input', 'android', 'src', 'main', 'java', 'expo', 'modules', 'pasteinput', 'ExpoPasteInputView.kt'),
        // Fallback for monorepos or different hoisted setups
        path.join(config.modRequest.projectRoot, '..', 'node_modules', 'expo-paste-input', 'android', 'src', 'main', 'java', 'expo', 'modules', 'pasteinput', 'ExpoPasteInputView.kt')
      ];

      let targetFile = null;
      for (const filePath of filePaths) {
        if (fs.existsSync(filePath)) {
          targetFile = filePath;
          break;
        }
      }

      if (!targetFile) {
        console.warn('withPasteInputFix: Could not find ExpoPasteInputView.kt');
        return config;
      }

      let contents = fs.readFileSync(targetFile, 'utf-8');

      // The original code has:
      // if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      //   setOnReceiveContentListener(
      //     arrayOf("image/*", "text/plain"),
      //     PasteReceiver(this)
      //   )
      // }
      
      // Replace API 31+ guard around setOnReceiveContentListener
      const pattern1 = /if\\s*\\(Build\\.VERSION\\.SDK_INT\\s*>=\\s*Build\\.VERSION_CODES\\.S\\)\\s*\\{\\s*(contentListener\\s*=\\s*createContentListener\\(\\))\\s*(ViewCompat\\.setOnReceiveContentListener\\([\\s\\S]*?\\))\\s*\\}/m;
      
      // Replace API 31+ guard around cleanup
      const pattern2 = /if\\s*\\(Build\\.VERSION\\.SDK_INT\\s*>=\\s*Build\\.VERSION_CODES\\.S\\s*&&\\s*contentListener\\s*!=\\s*null\\)\\s*\\{\\s*(ViewCompat\\.setOnReceiveContentListener\\(editText,\\s*null,\\s*null\\))\\s*\\}/m;

      let modified = false;

      if (pattern1.test(contents)) {
        contents = contents.replace(pattern1, "$1\\n    $2");
        modified = true;
      }

      if (pattern2.test(contents)) {
        contents = contents.replace(pattern2, "if (contentListener != null) {\\n      $1\\n    }");
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(targetFile, contents);
        console.log('withPasteInputFix: Successfully applied fix to ExpoPasteInputView.kt');
      } else if (!contents.includes('Build.VERSION.SDK_INT >= Build.VERSION_CODES.S')) {
        console.log('withPasteInputFix: Already fixed');
      } else {
        console.warn('withPasteInputFix: Could not find target code block to replace');
      }

      return config;
    },
  ]);
};

module.exports = withPasteInputFix;
