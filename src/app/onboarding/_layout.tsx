import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="user-info" />
    </Stack>
  );
}
