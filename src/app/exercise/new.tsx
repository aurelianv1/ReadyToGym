import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui';
import { addExerciseToWorkout, createExercise, getExercise, MUSCLE_GROUPS } from '@/db/queries';
import { colors, radius, spacing } from '@/theme';
import { deliverPick } from '@/utils/exercisePicker';

export default function NewExerciseScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ name?: string; workoutId?: string; mode?: string }>();
  const [name, setName] = useState(params.name ?? '');
  const [group, setGroup] = useState<string>(MUSCLE_GROUPS[0]);

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Lipsește numele', 'Scrie un nume pentru exercițiu.');
      return;
    }
    const id = await createExercise(db, name, group);
    if (id == null) {
      Alert.alert('Există deja', `Ai deja un exercițiu numit „${name.trim()}”.`);
      return;
    }
    if (params.mode === 'callback') {
      // Opened from the picker on behalf of the routine editor: hand it back and close both modals.
      const exercise = await getExercise(db, id);
      if (exercise) deliverPick(exercise);
      router.dismiss(2);
    } else if (params.workoutId) {
      await addExerciseToWorkout(db, Number(params.workoutId), id);
      router.dismissTo('/workout/active');
    } else {
      router.back();
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Nume</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="ex: Împins la aparat"
        placeholderTextColor={colors.muted}
        autoFocus={!params.name}
      />

      <Text style={styles.label}>Grupa musculară</Text>
      <View style={styles.groups}>
        {MUSCLE_GROUPS.map((g) => (
          <Pressable
            key={g}
            onPress={() => setGroup(g)}
            style={[styles.chip, group === g && styles.chipActive]}
          >
            <Text style={[styles.chipText, group === g && styles.chipTextActive]}>{g}</Text>
          </Pressable>
        ))}
      </View>

      <Button
        title={params.workoutId || params.mode ? 'Salvează și adaugă' : 'Salvează'}
        icon="checkmark"
        onPress={onSave}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: spacing.md },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 17,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: colors.accentText },
});
