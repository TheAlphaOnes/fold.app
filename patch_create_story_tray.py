import re

with open('src/components/create-story-tray.tsx', 'r') as f:
    content = f.read()

# Add imports if they don't exist
if 'AsciiArt' not in content:
    content = content.replace(
        "import { X, Check } from 'lucide-react-native';",
        "import { X, Check } from 'lucide-react-native';\nimport { AsciiArt } from '@/components/ascii-art';\nimport { BOOK_ART } from '@/constants/ascii-art';"
    )

old_form_regex = r"<View style=\{styles\.createContainer\}>\s*<TextInput[\s\S]*?onSubmitEditing=\{handleCreate\}\s*\/>\s*<\/View>"

new_form = """<View style={[styles.createContainer]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 8 }}>
              <ThemedText style={{ color: theme.accentWarm, fontFamily: 'JetBrainsMono-Bold', fontSize: 18, marginRight: 12 }}>{'>'}</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="STORY.TITLE..."
                autoCapitalize="characters"
                placeholderTextColor={theme.textMuted}
                value={title}
                onChangeText={setTitle}
                cursorColor={theme.accentWarm}
                selectionColor={theme.accentWarm}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </View>
            <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.6 }}>
              <AsciiArt art={BOOK_ART} color={theme.textMuted} fontSize={12} />
            </View>
          </View>"""

content = re.sub(old_form_regex, new_form, content)

# Redesign input style
old_input_style = r"  input: \{[\s\S]*?\},"
new_input_style = """  input: {
    fontFamily: 'JetBrainsMono-Bold',
    textTransform: 'uppercase',
    fontSize: 18,
    flex: 1,
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },"""
content = re.sub(old_input_style, new_input_style, content)

with open('src/components/create-story-tray.tsx', 'w') as f:
    f.write(content)
