import re

with open('src/app/_layout.tsx', 'r') as f:
    content = f.read()

content = content.replace("has_avatar: !!settings.avatarUri,", "")
content = content.replace("settings.avatarUri", "")

with open('src/app/_layout.tsx', 'w') as f:
    f.write(content)
