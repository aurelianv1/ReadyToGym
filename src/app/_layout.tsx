import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { migrateDbIfNeeded } from '@/db/schema';
import { colors } from '@/theme';

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
          <Stack.Screen name="nutrition/add" options={{ title: 'Adaugă', presentation: 'modal' }} />
          <Stack.Screen name="nutrition/entry" options={{ title: '' }} />
          <Stack.Screen name="nutrition/food" options={{ title: 'Aliment' }} />
          <Stack.Screen name="nutrition/targets" options={{ title: 'Ținte zilnice' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
