with open('src/app/_layout.tsx', 'r') as f:
    content = f.read()

content = content.replace("""      posthog.register({
        has_name: !!settings.name,
        has_avatar: !!settings.avatarUri,
        ...(ageRange ? { age_range: ageRange } : {})
      });
      // Try to identify user if they have a distinct ID/name
      // But just setting global properties via register is often enough for PostHog to attach to the anonymous distinct ID""", """      const props = {
        has_name: !!settings.name,
        has_avatar: !!settings.avatarUri,
        ...(ageRange ? { age_range: ageRange } : {})
      };
      posthog.register(props);
      posthog.capture("$set", { $set: props });""")

with open('src/app/_layout.tsx', 'w') as f:
    f.write(content)
