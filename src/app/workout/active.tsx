import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SetHeader, SetRowView, type SetValues } from '@/components/SetRowView';
import { Button, Card, EmptyState } from '@/components/ui';
import {
  addSet,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  getPreviousSets,
  getWorkoutExercises,
  removeWorkoutExercise,
  renameWorkout,
  updateSet,
  type SetRow,
  type Workout,
  type WorkoutExercise,
} from '@/db/queries';
import { colors, radius, spacing } from '@/theme';
import { formatClock } from '@/utils/format';

export default function ActiveWorkoutScreen() {
  const db = useSQLiteContext();
  const headerHeight = useHeaderHeight();

  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [previous, setPrevious] = useState<Record<number, SetRow[]>>({});
  const [name, setName] = useState('');
  const [restStart, setRestStart] = useState<number | null>(null);

  const load = useCallback(async () => {
    const w = await getActiveWorkout(db);
    if (!w) {
      setWorkout(null);
      return;
    }
    const ex = await getWorkoutExercises(db, w.id);
    const prev = await Promise.all(
      ex.map(async (e) => [e.exercise_id, await getPreviousSets(db, e.exercise_id, w.id)] as const),
    );
    setWorkout(w);
    setExercises(ex);
    setPrevious(Object.fromEntries(prev));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (workout) setName(workout.name);
  }, [workout?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSetChange = useCallback(
    (weId: number, setId: number, values: SetValues) => {
      setExercises((prev) =>
        prev.map((e) =>
          e.id !== weId
            ? e
            : {
                ...e,
                sets: e.sets.map((s) =>
                  s.id !== setId
                    ? s
                    : { ...s, weight: values.weight, reps: values.reps, done: values.done ? 1 : 0 },
                ),
              },
        ),
      );
      updateSet(db, setId, values);
    },
    [db],
  );

  async function onAddSet(weId: number) {
    await addSet(db, weId);
    await load();
  }

  async function onDeleteSet(setId: number) {
    await deleteSet(db, setId);
    await load();
  }

  function onExerciseMenu(e: WorkoutExercise) {
    Alert.alert(e.name, undefined, [
      { text: 'Renunță', style: 'cancel' },
      {
        text: 'Elimină din antrenament',
        style: 'destructive',
        onPress: async () => {
          await removeWorkoutExercise(db, e.id);
          await load();
        },
      },
    ]);
  }

  function onFinish() {
    if (!workout) return;
    Alert.alert('Termini antrenamentul?', 'Seturile necompletate vor fi ignorate.', [
      { text: 'Încă nu', style: 'cancel' },
      {
        text: 'Termină',
        onPress: async () => {
          await renameWorkout(db, workout.id, name);
          const kept = await finishWorkout(db, workout.id);
          if (kept === 0) {
            Alert.alert('Antrenament gol', 'Nu ai completat niciun set, așa că nu a fost salvat.');
            router.back();
          } else {
            router.replace(`/workout/${workout.id}`);
          }
        },
      },
    ]);
  }

  function onDiscard() {
    if (!workout) return;
    Alert.alert('Renunți la antrenament?', 'Tot ce ai notat în acest antrenament va fi șters.', [
      { text: 'Nu', style: 'cancel' },
      {
        text: 'Da, șterge',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(db, workout.id);
          router.back();
        },
      },
    ]);
  }

  if (workout === undefined) return <View style={styles.screen} />;
  if (workout === null) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="barbell-outline"
          title="Niciun antrenament în curs"
          text="Pornește un antrenament din ecranul principal."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={onFinish} hitSlop={8} style={styles.finishBtn}>
              <Text style={styles.finishText}>Termină</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.topBar}>
        <View style={styles.topItem}>
          <Ionicons name="time-outline" size={18} color={colors.muted} />
          <Clock since={workout.started_at} style={styles.topValue} />
        </View>
        {restStart && (
          <Pressable style={styles.restPill} onPress={() => setRestStart(null)}>
            <Ionicons name="hourglass-outline" size={16} color={colors.accent} />
            <Text style={styles.restLabel}>Pauză</Text>
            <Clock since={restStart} style={styles.restValue} />
            <Ionicons name="close" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          onEndEditing={() => renameWorkout(db, workout.id, name)}
          placeholder="Numele antrenamentului"
          placeholderTextColor={colors.muted}
        />

        {exercises.length === 0 && (
          <EmptyState
            icon="add-circle-outline"
            title="Adaugă primul exercițiu"
            text="Alege din listă sau creează unul nou. Pentru fiecare vei vedea ce ai făcut data trecută."
          />
        )}

        {exercises.map((e) => {
          const prev = previous[e.exercise_id] ?? [];
          return (
            <Card key={e.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => router.push(`/exercise/${e.exercise_id}`)}
                >
                  <Text style={styles.exerciseName}>{e.name}</Text>
                  <Text style={styles.exerciseGroup}>{e.muscle_group}</Text>
                </Pressable>
                <Pressable onPress={() => onExerciseMenu(e)} hitSlop={10}>
                  <Ionicons name="ellipsis-horizontal" size={22} color={colors.muted} />
                </Pressable>
              </View>

              <SetHeader />
              {e.sets.map((s, i) => (
                <SetRowView
                  key={s.id}
                  index={i}
                  set={s}
                  previous={prev[i]}
                  suggestion={suggestFor(e.sets, prev, i)}
                  onChange={(v) => {
                    if (v.done && !s.done) setRestStart(Date.now());
                    onSetChange(e.id, s.id, v);
                  }}
                  onDelete={() => onDeleteSet(s.id)}
                />
              ))}

              <Button
                title="Adaugă set"
                icon="add"
                variant="secondary"
                onPress={() => onAddSet(e.id)}
                style={styles.addSet}
              />
            </Card>
          );
        })}

        <Button
          title="Adaugă exercițiu"
          icon="add-circle"
          onPress={() =>
            router.push({ pathname: '/exercise/pick', params: { workoutId: String(workout.id) } })
          }
        />
        <Button title="Termină antrenamentul" icon="checkmark-done" variant="secondary" onPress={onFinish} />
        <Button title="Renunță la antrenament" variant="danger" onPress={onDiscard} />

        {exercises.length > 0 && (
          <Text style={styles.hint}>
            Bifează ✓ un set gol ca să preiei valorile sugerate. Ține apăsat pe numărul setului ca să-l
            ștergi.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * What to suggest for set `i`: the same set from last session, otherwise the
 * closest set above it that has already been filled in.
 */
function suggestFor(current: SetRow[], previous: SetRow[], i: number) {
  const p = previous[i];
  if (p?.reps != null) return { weight: p.weight, reps: p.reps };
  for (let j = i - 1; j >= 0; j--) {
    const s = current[j];
    if (s.reps != null) return { weight: s.weight, reps: s.reps };
  }
  const last = previous[previous.length - 1];
  return last?.reps != null ? { weight: last.weight, reps: last.reps } : null;
}

/** Self-updating mm:ss clock, isolated so the whole screen doesn't re-render every second. */
function Clock({ since, style }: { since: number; style: object }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <Text style={style}>{formatClock(now - since)}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    minHeight: 40,
  },
  topItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  topValue: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  restPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  restLabel: { color: colors.muted, fontSize: 14 },
  restValue: { color: colors.accent, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  finishBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  finishText: { color: colors.accentText, fontWeight: '800' },
  nameInput: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    paddingVertical: spacing.xs,
  },
  exerciseCard: { gap: spacing.xs, padding: spacing.md },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  exerciseName: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  exerciseGroup: { color: colors.muted, fontSize: 13, marginTop: 2 },
  addSet: { marginTop: spacing.sm, paddingVertical: 10 },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
