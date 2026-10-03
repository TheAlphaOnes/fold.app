import re

with open('src/components/create-story-tray.tsx', 'r') as f:
    content = f.read()

# Fix the hook rule violation by moving useAnimatedStyle BEFORE the early return
# I will extract the useAnimatedStyle hooks into variables before the `if (!mounted) return null;`

content = content.replace("  if (!mounted) return null;\n\n  return (", """
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    backgroundColor: 'rgba(0,0,0,0.6)',
  }));

  const trayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  if (!mounted) return null;

  return (""")

content = content.replace("useAnimatedStyle(() => ({\n        opacity: overlayOpacity.value,\n        backgroundColor: 'rgba(0,0,0,0.6)',\n      }))", "backdropStyle")

content = content.replace("useAnimatedStyle(() => ({\n            transform: [{ translateY: translateY.value }]\n          }))", "trayStyle")

with open('src/components/create-story-tray.tsx', 'w') as f:
    f.write(content)
