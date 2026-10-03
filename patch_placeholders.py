import re

for filename in ['src/components/create-story-tray.tsx', 'src/components/story-picker.tsx']:
    with open(filename, 'r') as f:
        content = f.read()
    
    # Replace placeholder
    content = content.replace('placeholder="Name your story..."', 'placeholder="STORY.TITLE..."\n              autoCapitalize="characters"')
    
    with open(filename, 'w') as f:
        f.write(content)
