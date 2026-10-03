import re

# Story Delete
with open('src/app/stories/[id].tsx', 'r') as f:
    content = f.read()

if 'usePostHog' not in content:
    content = content.replace("import { useTheme } from '@/hooks/use-theme';", "import { usePostHog } from 'posthog-react-native';\nimport { useTheme } from '@/hooks/use-theme';")

if 'const posthog =' not in content:
    content = content.replace("const theme = useTheme();", "const theme = useTheme();\n  const posthog = usePostHog();")

if "capture('Story Deleted')" not in content:
    content = content.replace("removeStory(activeStory.id);", "removeStory(activeStory.id);\n      posthog?.capture('Story Deleted');")

with open('src/app/stories/[id].tsx', 'w') as f:
    f.write(content)

# Memory Delete
with open('src/app/memory/[id].tsx', 'r') as f:
    content = f.read()

if "capture('Memory Deleted')" not in content:
    content = content.replace("await removeComposition(id);", "await removeComposition(id);\n    posthog?.capture('Memory Deleted');")

with open('src/app/memory/[id].tsx', 'w') as f:
    f.write(content)

