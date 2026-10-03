import re

def fix_input_style(filepath, font_size, height):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # We will replace the whole input block
    old_input_regex = r"  input: \{[\s\S]*?\},"
    
    new_input = f"""  input: {{
    fontFamily: 'JetBrainsMono-Bold',
    textTransform: 'uppercase',
    fontSize: {font_size},
    height: {height},
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderWidth: 0,
    borderRadius: 12,
  }},"""
    
    content = re.sub(old_input_regex, new_input, content)
    
    with open(filepath, 'w') as f:
        f.write(content)

fix_input_style('src/components/create-story-tray.tsx', 14, 52)
fix_input_style('src/components/story-picker.tsx', 14, 52) # Let's standardize the font size to 14 to match CreateStoryTray
