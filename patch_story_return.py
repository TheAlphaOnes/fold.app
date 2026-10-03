import re

with open('src/app/stories/[id].tsx', 'r') as f:
    content = f.read()

old_return = r"      \{/\* Story Media Viewer Overlay \*/\}\n      \{viewerState\.isOpen && \(\n        <StoryViewer \n          items=\{viewerItems\} \n          initialIndex=\{viewerState\.initialIndex\} \n          onClose=\{\(\) => setViewerState\(\{ \.\.\.viewerState, isOpen: false \}\)\} \n        \/>\n      \)\}\n    <\/View>\n  \);\n\}"

new_return = """      {/* Story Media Viewer Overlay */}
      {viewerState.isOpen && (
        <StoryViewer 
          items={viewerItems} 
          initialIndex={viewerState.initialIndex} 
          onClose={() => setViewerState({ ...viewerState, isOpen: false })} 
        />
      )}

      {isDeleting && <DigitalAshOverlay color={theme.background} onComplete={finalizeDelete} />}
    </View>
  );
}"""

content = re.sub(old_return, new_return, content)

with open('src/app/stories/[id].tsx', 'w') as f:
    f.write(content)
