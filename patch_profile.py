import re

with open('src/app/profile.tsx', 'r') as f:
    content = f.read()

# Add useStoriesStore import
content = content.replace("import { GrainBackground } from '@/components/grain-background';", "import { useStoriesStore } from '@/hooks/use-stories';\nimport { GrainBackground } from '@/components/grain-background';")

# Extract stories
content = content.replace("  const [compositions, setCompositions] = useState<Composition[]>([]);", "  const [compositions, setCompositions] = useState<Composition[]>([]);\n  const { stories, refreshStories } = useStoriesStore();\n\n  useEffect(() => {\n    refreshStories();\n  }, []);")

# Create the new card component inline or just map stories
# The card will have the same header, and a ScrollView horizontally
new_card = """        {/* Extended Story Board Card */}
        <View style={[styles.portfolioSection, { backgroundColor: elementBg, borderColor: borderColor, padding: 0, overflow: 'hidden' }]}>
          <Pressable 
            style={({ pressed }) => [
              { 
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent', 
              }
            ]}
            onPress={() => router.push('/stories')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Book size={14} color={theme.textMuted} />
              <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STORY BOARD</ThemedText>
            </View>
            <ChevronRight size={16} color={mutedText} />
          </Pressable>

          {stories.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
            >
              {stories.slice(0, 5).map(story => (
                <Pressable
                  key={story.id}
                  onPress={() => router.push(`/stories/${story.id}`)}
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
                  {story.coverImageUri ? (
                    <Image source={{ uri: story.coverImageUri }} style={{ width: '100%', height: '100%' }} />
                  ) : story.sampleMedia && story.sampleMedia.length > 0 ? (
                    <Image source={{ uri: story.sampleMedia[0].uri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <ThemedText style={{ color: theme.textMuted, fontFamily: 'JetBrainsMono-Bold' }}>///</ThemedText>
                    </View>
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
                  <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
                    <ThemedText style={{ color: '#fff', fontFamily: 'JetBrainsMono-Bold', fontSize: 10 }} numberOfLines={2}>
                      {story.title}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>"""

# Replace old sleekRow
old_card_regex = r'\{\/\* Sleek Story Board Row \*\/\}[\s\S]*?<\/Pressable>'
content = re.sub(old_card_regex, new_card, content)

# Add Image import if needed
if "import { Image " not in content and "import { Image," not in content and "Image," not in content:
    content = content.replace("import { View, StyleSheet, Pressable, ScrollView } from 'react-native';", "import { View, StyleSheet, Pressable, ScrollView, Image } from 'react-native';")
else:
    # Ensure Image is in react-native import
    content = content.replace("import { View, StyleSheet, Pressable, ScrollView }", "import { View, StyleSheet, Pressable, ScrollView, Image }")


with open('src/app/profile.tsx', 'w') as f:
    f.write(content)
