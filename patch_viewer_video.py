import re

with open('src/components/story-viewer.tsx', 'r') as f:
    content = f.read()

# 1. Add expo-video import
content = content.replace("import { Image } from 'expo-image';", "import { Image } from 'expo-image';\nimport { useVideoPlayer, VideoView } from 'expo-video';")

# 2. Add video logic to ViewerCard
# ViewerCard starts at `const ViewerCard = React.memo(({`
# Inside ViewerCard, we add the player hook for videos.
player_hook = """
  // For videos
  const player = useVideoPlayer(item.uri, player => {
    player.loop = true;
    player.muted = true; // start muted for autoplay
    player.play();
  });
"""

content = content.replace("  const cardStyle = useAnimatedStyle(() => {", player_hook + "\n  const cardStyle = useAnimatedStyle(() => {")

# 3. Update the render logic in ViewerCard
new_render = """        {item.type === 'image' && (
          <Image
            source={{ uri: item.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
        )}
        {item.type === 'video' && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        )}"""

old_render_regex = r"\{\(item\.type === 'image' \|\| item\.type === 'video'\) && \(\s*<Image\s*source=\{\{ uri: item\.uri \}\}\s*style=\{StyleSheet\.absoluteFill\}\s*contentFit=\"cover\"\s*transition=\{0\}\s*\/>\s*\)\}\s*\{item\.type === 'video' && \(\s*<View style=\{styles\.videoOverlay\}>\s*<Play size=\{32\} color=\"#FFF\" fill=\"#FFF\" \/>\s*<\/View>\s*\)\}"

content = re.sub(old_render_regex, new_render, content)

with open('src/components/story-viewer.tsx', 'w') as f:
    f.write(content)
