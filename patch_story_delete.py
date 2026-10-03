import re

with open('src/app/stories/[id].tsx', 'r') as f:
    content = f.read()

# 1. Add Imports
if 'Alert' not in content:
    content = content.replace("Text, Platform } from 'react-native';", "Text, Platform, Alert } from 'react-native';")

if 'DigitalAshOverlay' not in content:
    content = content.replace("import { StoryViewer } from '@/components/story-viewer';", "import { StoryViewer } from '@/components/story-viewer';\nimport { DigitalAshOverlay } from '@/components/digital-ash-overlay';")


# 2. Add state and modify handlers
old_delete_logic = r"  const handleDelete = \(\) => \{\n    if \(activeStory\) \{\n      Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Warning\);\n      removeStory\(activeStory\.id\);\n      router\.back\(\);\n    \}\n  \};"

new_delete_logic = """  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (!activeStory) return;
    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
          }
        }
      ]
    );
  };

  const finalizeDelete = () => {
    if (activeStory) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      removeStory(activeStory.id);
      router.back();
    }
  };"""

content = re.sub(old_delete_logic, new_delete_logic, content)


# 3. Add DigitalAshOverlay component at the very end of the return statement
old_return = r"      \{viewerState\.isOpen && \(\n        <StoryViewer\n          initialIndex=\{viewerState\.initialIndex\}\n          items=\{storyItems\}\n          onClose=\{\(\) => setViewerState\(prev => \(\{ \.\.\.prev, isOpen: false \}\)\)\}\n        \/>\n      \)\}\n    <\/View>\n  \);\n\}"

new_return = """      {viewerState.isOpen && (
        <StoryViewer
          initialIndex={viewerState.initialIndex}
          items={storyItems}
          onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
      
      {isDeleting && <DigitalAshOverlay color={theme.background} onComplete={finalizeDelete} />}
    </View>
  );
}"""

content = re.sub(old_return, new_return, content)

with open('src/app/stories/[id].tsx', 'w') as f:
    f.write(content)
