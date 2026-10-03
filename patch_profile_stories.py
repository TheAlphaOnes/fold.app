import re

with open('src/app/profile.tsx', 'r') as f:
    content = f.read()

# 1. Randomize stories
# Right now it says `{stories.slice(0, 5).map(story => (`
# Let's shuffle them in a useMemo.
content = content.replace("const { stories, refreshStories } = useStoriesStore();", """const { stories, refreshStories } = useStoriesStore();
  const randomStories = React.useMemo(() => {
    const shuffled = [...stories].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [stories]);""")

content = content.replace("{stories.slice(0, 5).map(story => (", "{randomStories.map(story => (")

# 2. Fix the text styling in the story cards
# Replace `numberOfLines={2}` with `numberOfLines={1}` and `textTransform: 'uppercase'`
content = content.replace("numberOfLines={2}", "numberOfLines={1}")
content = content.replace("fontSize: 10", "fontSize: 10, textTransform: 'uppercase'")

with open('src/app/profile.tsx', 'w') as f:
    f.write(content)
