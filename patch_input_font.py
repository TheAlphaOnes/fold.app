import re

for filename in ['src/components/create-story-tray.tsx', 'src/components/story-picker.tsx']:
    with open(filename, 'r') as f:
        content = f.read()
    
    # Force text to uppercase and use bold font to match the aesthetic
    content = content.replace("fontFamily: 'JetBrainsMono-Medium',", "fontFamily: 'JetBrainsMono-Bold',\n    textTransform: 'uppercase',")
    
    with open(filename, 'w') as f:
        f.write(content)
