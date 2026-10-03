import re

with open('src/app/stories/index.tsx', 'r') as f:
    content = f.read()

# 1. Add import
content = content.replace("import { GrainBackground } from '@/components/grain-background';", "import { GrainBackground } from '@/components/grain-background';\nimport { CreateStoryTray } from '@/components/create-story-tray';")

# 2. Remove newTitle and setNewTitle
content = re.sub(r'const \[newTitle, setNewTitle\] = useState\(\'\'\);\n', '', content)

# 3. Remove handleCreate function
content = re.sub(r'  const handleCreate = async \(\) => \{[\s\S]*?  \};\n\n', '', content)

# 4. Make header actions always visible (remove {!isCreating && ( ... )})
content = content.replace("{!isCreating && (\n          <View style={{ flexDirection: 'row'", "<View style={{ flexDirection: 'row'")
content = content.replace("          </View>\n        )}\n      </View>", "          </View>\n      </View>")

# 5. Replace inline create UI with CreateStoryTray
content = re.sub(r'\{\/\* Create Mode Inline \*\/\}[\s\S]*?\{\/\* Empty State \*\/\}', '{/* Empty State */}', content)

# 6. Add CreateStoryTray at the bottom
content = content.replace("    </View>\n  );\n}", "      {isCreating && (\n        <CreateStoryTray onClose={() => setIsCreating(false)} />\n      )}\n    </View>\n  );\n}")

# 7. Update Empty State logic (remove !isCreating condition)
content = content.replace("{stories.length === 0 && !isCreating ?", "{stories.length === 0 ?")

with open('src/app/stories/index.tsx', 'w') as f:
    f.write(content)
