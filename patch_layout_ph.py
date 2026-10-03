import re

with open('src/app/_layout.tsx', 'r') as f:
    content = f.read()

# Add import
if 'getAgeRange' not in content:
    content = content.replace("import { PostHogProvider, usePostHog } from \"posthog-react-native\";", "import { PostHogProvider, usePostHog } from \"posthog-react-native\";\nimport { getAgeRange } from '@/utils/dob';")

# Add the sync logic inside PostHogSync
old_sync = r"    if \(posthog && pathname\) \{\n      posthog\.screen\(pathname, params as Record<string, any>\);\n    \}\n  \}, \[posthog, pathname, params\]\);"

new_sync = """    if (posthog && pathname) {
      posthog.screen(pathname, params as Record<string, any>);
    }
  }, [posthog, pathname, params]);

  // Sync user demographic props
  useEffect(() => {
    if (posthog) {
      const ageRange = getAgeRange(settings.dob);
      posthog.register({
        has_name: !!settings.name,
        has_avatar: !!settings.avatarUri,
        ...(ageRange ? { age_range: ageRange } : {})
      });
      // Try to identify user if they have a distinct ID/name
      // But just setting global properties via register is often enough for PostHog to attach to the anonymous distinct ID
    }
  }, [posthog, settings.dob, settings.name, settings.avatarUri]);"""

if "// Sync user demographic props" not in content:
    content = re.sub(old_sync, new_sync, content)

with open('src/app/_layout.tsx', 'w') as f:
    f.write(content)
