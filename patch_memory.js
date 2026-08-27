const fs = require('fs');
const file = 'src/app/memory/[id].tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add StoryPicker import
if (!content.includes('import { StoryPicker }')) {
  content = content.replace(
    "import { VinylRecord } from '@/components/vinyl-record';",
    "import { VinylRecord } from '@/components/vinyl-record';\nimport { StoryPicker } from '@/components/story-picker';"
  );
}

// 2. Remove StoryPickerThumbnail component
content = content.replace(/function StoryPickerThumbnail.*?return null;\n}\n\n/s, '');

// 3. Replace inline modal with <StoryPicker>
const modalStart = content.indexOf('{/* Story Picker Menu */}');
const modalEndMarker = '</Modal>\n      {isDeleting';
const modalEnd = content.indexOf(modalEndMarker, modalStart);

if (modalStart !== -1 && modalEnd !== -1) {
  const newPicker = `<StoryPicker
        mode="multi"
        visible={isStoryPickerVisible}
        onClose={() => setIsStoryPickerVisible(false)}
        selectedStoryIds={composition?.storyIds ?? []}
        onToggle={async (storyId) => {
          if (!composition) return;
          await toggleStoryId(composition.id, storyId);
        }}
      />
      {isDeleting`;
  content = content.substring(0, modalStart) + newPicker + content.substring(modalEnd + modalEndMarker.length - '{isDeleting'.length);
}

fs.writeFileSync(file, content);
console.log('Patched memory/[id].tsx');
