import re

def swap_art(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace import
    content = content.replace("import { QUILL_ART } from '@/constants/ascii-art';", "import { COFFEE_ART } from '@/constants/ascii-art';")
    
    # Replace usage
    content = content.replace("art={QUILL_ART}", "art={COFFEE_ART}")
    
    with open(filepath, 'w') as f:
        f.write(content)

swap_art('src/components/create-story-tray.tsx')
swap_art('src/components/story-picker.tsx')
