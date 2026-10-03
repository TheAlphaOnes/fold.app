const fs = require('fs');

function checkFile(path) {
  const code = fs.readFileSync(path, 'utf-8');
  // Look for any line that has `{.*}` directly inside a <View> or similar without being inside <Text> or similar.
  // Actually, this is hard with regex. 
  // Let's just look for `{` that might not be a component attribute.
  
  // A common mistake is `something && <View>` where `something` is a number or string.
  const regex = /\{([^<>{}]+)&&\s*</g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const expr = match[1].trim();
    if (!expr.includes('>') && !expr.includes('<') && !expr.includes('==') && !expr.includes('!')) {
      console.log(`Potential issue in ${path}: {${expr} && <...`);
    }
  }
}

checkFile('src/app/profile.tsx');
checkFile('src/components/story-viewer.tsx');
checkFile('src/components/create-story-tray.tsx');
checkFile('src/app/stories/index.tsx');
