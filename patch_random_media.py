import re

with open('src/app/profile.tsx', 'r') as f:
    content = f.read()

new_memo = """  const randomStoryMedia = React.useMemo(() => {
    // 1. Gather all possible media across all stories
    type StoryMedia = { storyId: number; title: string; uri: string | null };
    let allMedia: StoryMedia[] = [];
    let emptyStories: StoryMedia[] = [];

    stories.forEach(story => {
      let hasMedia = false;
      if (story.coverImageUri) {
        allMedia.push({ storyId: story.id, title: story.title, uri: story.coverImageUri });
        hasMedia = true;
      }
      if (story.sampleMedia && story.sampleMedia.length > 0) {
        story.sampleMedia.forEach(m => {
          // Avoid duplicating the cover image if it's in sampleMedia
          if (m.uri !== story.coverImageUri) {
            allMedia.push({ storyId: story.id, title: story.title, uri: m.uri });
          }
        });
        hasMedia = true;
      }

      if (!hasMedia) {
        emptyStories.push({ storyId: story.id, title: story.title, uri: null });
      }
    });

    // 2. Shuffle the media pool
    const shuffledMedia = allMedia.sort(() => 0.5 - Math.random());
    
    // 3. Take up to 5
    let selected = shuffledMedia.slice(0, 5);

    // 4. If we don't have 5, fill with empty stories
    if (selected.length < 5 && emptyStories.length > 0) {
      const shuffledEmpty = emptyStories.sort(() => 0.5 - Math.random());
      selected = [...selected, ...shuffledEmpty].slice(0, 5);
    }

    return selected;
  }, [stories]);"""

old_memo = r"  const randomStories = React\.useMemo\(\(\) => \{\n    const shuffled = \[\.\.\.stories\]\.sort\(\(\) => 0\.5 - Math\.random\(\)\);\n    return shuffled\.slice\(0, 5\);\n  \}, \[stories\]\);"

content = re.sub(old_memo, new_memo, content)

# Also update the render block
old_render = r"\{randomStories\.map\(story => \([\s\S]*?\{story\.title\}[\s\S]*?<\/View>\n                <\/Pressable>\n              \)\)\}"

new_render = """{randomStoryMedia.map((item, idx) => (
                <Pressable
                  key={`${item.storyId}-${idx}`}
                  onPress={() => router.push(`/stories/${item.storyId}` as any)}
                  style={({ pressed }) => [
                    {
                      width: 100,
                      height: 140,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: theme.backgroundElement,
                      borderWidth: 1,
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    }
                  ]}
                >
                  {item.uri ? (
                    <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <ThemedText style={{ color: theme.textMuted, fontFamily: 'JetBrainsMono-Bold' }}>///</ThemedText>
                    </View>
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
                  <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
                    <ThemedText style={{ color: '#fff', fontFamily: 'JetBrainsMono-Bold', fontSize: 10, textTransform: 'uppercase' }} numberOfLines={1}>
                      {item.title}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}"""

content = re.sub(old_render, new_render, content)

with open('src/app/profile.tsx', 'w') as f:
    f.write(content)
