import re

with open('src/components/story-viewer.tsx', 'r') as f:
    content = f.read()

content = content.replace("const player = useVideoPlayer(item.uri, player => {", "const player = useVideoPlayer(item.type === 'video' && item.uri ? item.uri : null, player => {")

with open('src/components/story-viewer.tsx', 'w') as f:
    f.write(content)
