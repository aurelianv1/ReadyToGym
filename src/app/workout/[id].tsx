import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Stat } from '@/components/ui';
import {
  createRoutineFromWorkout,
  deleteWorkout,
  getWorkout,
  getWorkoutExercises,
} from '@/db/queries';
import { useFocusData } from '@/hooks/useFocusData';
import { colors, spacing } from '@/theme';
import { formatDate, formatDuration, formatSet, formatTime, formatVolume } from '@/utils/format';

export default function WorkoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);

  const { data, db } = useFocusData(
    async (db) => {
      const [workout, exercises] = await Promise.all([
        getWorkout(db, workoutId),
        getWorkoutExercises(db, workoutId),
      ]);
      return { workout, exercises };
    },
    [workoutId],
  );

  if (!data) return <View style={styles.screen} />;
  const { workout, exercises } = data;
  if (!workout) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Antrenamentul nu mai există.</Text>
      </View>
    );
  }

  const allSets = exercises.flatMap((e) => e.sets);
  const volume = allSets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
  const duration = (workout.finished_at ?? Date.now()) - workout.started_at;

  async function onSaveAsRoutine() {
    if (!workout) return;
    const routineId = await createRoutineFromWorkout(db, workoutId, workout.name);
    router.push({ pathname: '/routine/edit', params: { id: String(routineId) } });
  }

  function onDelete() {
    Alert.alert('Ștergi antrenamentul?', 'Acțiunea nu poate fi anulată.', [
      { text: 'Nu', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(db, workoutId);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>{workout.name}</Text>
        <Text style={styles.muted}>
          {formatDate(workout.started_at)} · {formatTime(workout.started_at)}
        </Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Durată" value={formatDuration(duration)} />
        <Stat label="Seturi" value={String(allSets.length)} />
        <Stat label="Volum" value={formatVolume(volume)} />
      </View>

      {exercises.map((e) => (
        <Card key={e.id}>
          <Pressable onPress={() => router.push(`/exercise/${e.exercise_id}`)}>
            <Text style={styles.exerciseName}>{e.name}</Text>
          </Pressable>
          {e.sets.map((s, i) => (
            <View key={s.id} style={styles.setRow}>
              <Text style={styles.setIndex}>{i + 1}</Text>
              <Text style={styles.setText}>{formatSet(s.weight, s.reps)}</Text>
            </View>
          ))}
        </Card>
      ))}

      {workout.finished_at != null && exercises.length > 0 && (
        <Button
          title="Salvează ca rutină"
          icon="albums-outline"
          variant="secondary"
          onPress={onSaveAsRoutine}
        />
      )}
      <Button title="Șterge antrenamentul" icon="trash-outline" variant="danger" onPress={onDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 14, marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  exerciseName: { color: colors.accent, fontSize: 17, fontWeight: '800', marginBottom: spacing.sm },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  setIndex: { width: 28, color: colors.muted, fontWeight: '700' },
  setText: { color: colors.text, fontSize: 16 },
});
