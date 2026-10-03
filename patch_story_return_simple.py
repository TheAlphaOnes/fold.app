with open('src/app/stories/[id].tsx', 'r') as f:
    content = f.read()

target = """      {/* Story Media Viewer Overlay */}
      {viewerState.isOpen && (
        <StoryViewer 
          items={viewerItems} 
          initialIndex={viewerState.initialIndex} 
          onClose={() => setViewerState({ ...viewerState, isOpen: false })} 
        />
      )}
    </View>
  );
}"""

replacement = """      {/* Story Media Viewer Overlay */}
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

content = content.replace(target, replacement)

with open('src/app/stories/[id].tsx', 'w') as f:
    f.write(content)
