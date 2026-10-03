import re

# 1. Update Onboarding Tagline
with open('src/app/onboarding/index.tsx', 'r') as f:
    content = f.read()

content = content.replace("OFFLINE MEMORY ENGINE", "CAPTURE EVERYTHING. FORGET NOTHING.")

with open('src/app/onboarding/index.tsx', 'w') as f:
    f.write(content)

# 2. Remove Swipe Left
with open('src/components/carousel-item.tsx', 'r') as f:
    carousel_content = f.read()

# Remove the swipeLeft gesture definition
swipe_pattern = r"  const swipeLeft = Gesture\.Pan\(\)[\s\S]*?\.onFinalize\(\(\) => \{\n      pressedScale\.value = withTiming\(1, \{ duration: 150 \}\);\n    \}\);\n\n"
carousel_content = re.sub(swipe_pattern, "", carousel_content)

# Remove swipeLeft from Gesture.Exclusive
carousel_content = carousel_content.replace("Gesture.Exclusive(swipeLeft, doubleTap, longPress)", "Gesture.Exclusive(doubleTap, longPress)")

with open('src/components/carousel-item.tsx', 'w') as f:
    f.write(carousel_content)

