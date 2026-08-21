import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="name" />
      <Stack.Screen name="dob" />
      <Stack.Screen name="guide" options={{ animation: 'fade' }} />
    </Stack>
  );
}
