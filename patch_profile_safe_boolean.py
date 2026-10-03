import re
with open('src/app/profile.tsx', 'r') as f:
    content = f.read()

content = content.replace('{stories.length > 0 && (', '{stories.length > 0 ? (')
content = content.replace('      {/* Empty States */}', '      ) : null}\n\n      {/* Empty States */}')

with open('src/app/profile.tsx', 'w') as f:
    f.write(content)
