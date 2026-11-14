import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { migrateDbIfNeeded } from '@/db/schema';
import { colors } from '@/theme';

// Keep this file name even though the app was renamed (Jurnal Sală -> ReadyToGym):
// changing it would start with an empty database and lose all logged workouts.
const DATABASE_NAME = 'jurnal-sala.db';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="workout/active" options={{ title: 'Antrenament în curs' }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Antrenament' }} />
          <Stack.Screen
            name="exercise/pick"
            options={{ title: 'Adaugă exercițiu', presentation: 'modal' }}
          />
          <Stack.Screen
            name="exercise/new"
            options={{ title: 'Exercițiu nou', presentation: 'modal' }}
          />
          <Stack.Screen name="exercise/[id]" options={{ title: 'Exercițiu' }} />
          <Stack.Screen name="routine/edit" options={{ title: 'Rutină' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
