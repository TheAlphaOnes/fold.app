import re

with open('src/app/time-machine.tsx', 'r') as f:
    content = f.read()

# Replace ArrowLeft import back to X
content = content.replace("import { ArrowLeft } from 'lucide-react-native';", "import { X } from 'lucide-react-native';")

# Replace <ArrowLeft with <X
content = content.replace("<ArrowLeft size={16} color={theme.text} />", "<X size={16} color={theme.text} />")

# Replace left: 24 with right: 24 (or 16 to match previous margin)
content = content.replace("    position: 'absolute',\n    left: 24,", "    position: 'absolute',\n    right: 16,")

# Keep the top positioning: top: Math.max(insets.top, 20)
# We already set this in the previous commit, so we don't need to change `top`.

with open('src/app/time-machine.tsx', 'w') as f:
    f.write(content)
