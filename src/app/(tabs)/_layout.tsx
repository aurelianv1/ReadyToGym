import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import { colors } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', fontSize: 22 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Antrenament',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Istoric',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exerciții',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
