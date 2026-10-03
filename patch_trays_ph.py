import re

def add_posthog(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'usePostHog' not in content:
        content = content.replace("import { useTheme }", "import { usePostHog } from 'posthog-react-native';\nimport { useTheme }")
        
    old_const = r"  const theme = useTheme\(\);"
    new_const = "  const theme = useTheme();\n  const posthog = usePostHog();"
    if 'const posthog =' not in content:
        content = re.sub(old_const, new_const, content)
        
    old_create = r"(const handleCreate = async \(\) => \{[\s\S]*?addStory\(newStory\);)"
    new_create = r"\1\n    posthog?.capture('Story Created');"
    if "capture('Story Created')" not in content:
        content = re.sub(old_create, new_create, content)
        
    with open(filepath, 'w') as f:
        f.write(content)

add_posthog('src/components/create-story-tray.tsx')
add_posthog('src/components/story-picker.tsx')
