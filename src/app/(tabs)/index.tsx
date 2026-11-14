import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Stat } from '@/components/ui';
import {
  getActiveWorkout,
  getHomeStats,
  listRoutines,
  listWorkouts,
  startWorkout,
  startWorkoutFromRoutine,
  type RoutineSummary,
} from '@/db/queries';
import { useFocusData } from '@/hooks/useFocusData';
import { colors, radius, spacing } from '@/theme';
import {
  formatClock,
  formatDate,
  formatDuration,
  formatRelativeDay,
  formatVolume,
} from '@/utils/format';

export default function HomeScreen() {
  const { data, db } = useFocusData(async (db) => {
    const [active, stats, workouts, routines] = await Promise.all([
      getActiveWorkout(db),
      getHomeStats(db),
      listWorkouts(db),
      listRoutines(db),
    ]);
    return { active, stats, last: workouts[0] ?? null, routines };
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!data?.active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [data?.active]);

  async function onStartEmpty() {
    await startWorkout(db);
    router.push('/workout/active');
  }

  async function onStartRoutine(routine: RoutineSummary) {
    const workoutId = await startWorkoutFromRoutine(db, routine.id);
    if (workoutId == null) {
      Alert.alert(
        'Ai deja un antrenament în curs',
        'Termină-l sau renunță la el înainte să pornești altul.',
        [
          { text: 'Închide', style: 'cancel' },
          { text: 'Continuă-l', onPress: () => router.push('/workout/active') },
        ],
      );
      return;
    }
    router.push('/workout/active');
  }

  if (!data) return <View style={styles.screen} />;
  const { active, stats, last, routines } = data;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {active ? (
        <Card style={styles.activeCard}>
          <View style={styles.row}>
            <View style={styles.liveDot} />
            <Text style={styles.activeLabel}>În desfășurare</Text>
            <Text style={styles.timer}>{formatClock(now - active.started_at)}</Text>
          </View>
          <Text style={styles.activeName}>{active.name}</Text>
          <Button
            title="Continuă antrenamentul"
            icon="play"
            onPress={() => router.push('/workout/active')}
          />
        </Card>
      ) : (
        <Card style={styles.startCard}>
          <Ionicons name="barbell" size={36} color={colors.accent} />
          <Text style={styles.startTitle}>Gata de sală?</Text>
          <Text style={styles.startText}>
            {routines.length > 0
              ? 'Alege o rutină de mai jos sau pornește un antrenament gol.'
              : 'Pornește un antrenament și notează-ți exercițiile, greutățile și repetările.'}
          </Text>
          <Button
            title="Antrenament gol"
            icon="add"
            variant={routines.length > 0 ? 'secondary' : 'primary'}
            onPress={onStartEmpty}
            style={styles.fullWidth}
          />
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rutinele mele</Text>
        <Pressable onPress={() => router.push('/routine/edit')} hitSlop={8} style={styles.row}>
          <Ionicons name="add" size={18} color={colors.accent} />
          <Text style={styles.link}>Nouă</Text>
        </Pressable>
      </View>

      {routines.length === 0 ? (
        <Pressable onPress={() => router.push('/routine/edit')}>
          <Card style={styles.noRoutines}>
            <Ionicons name="albums-outline" size={28} color={colors.muted} />
            <Text style={styles.noRoutinesText}>
              Salvează-ți antrenamentele obișnuite (ex: Push / Pull / Legs) ca să le pornești cu o
              singură apăsare.
            </Text>
            <Text style={styles.link}>Creează prima rutină</Text>
          </Card>
        </Pressable>
      ) : (
        routines.map((r) => (
          <RoutineCard
            key={r.id}
            routine={r}
            disabled={!!active}
            onStart={() => onStartRoutine(r)}
            onEdit={() => router.push({ pathname: '/routine/edit', params: { id: String(r.id) } })}
          />
        ))
      )}

      <View style={styles.statsRow}>
        <Stat label="Săptămâna asta" value={String(stats.thisWeek)} />
        <Stat label="Total antrenamente" value={String(stats.total)} />
      </View>

      {last && (
        <>
          <Text style={styles.sectionTitle}>Ultimul antrenament</Text>
          <Pressable onPress={() => router.push(`/workout/${last.id}`)}>
            {({ pressed }) => (
              <Card style={pressed && { opacity: 0.7 }}>
                <Text style={styles.lastName}>{last.name}</Text>
                <Text style={styles.muted}>{formatDate(last.started_at)}</Text>
                <View style={styles.lastMeta}>
                  <Meta
                    icon="time-outline"
                    text={formatDuration((last.finished_at ?? 0) - last.started_at)}
                  />
                  <Meta icon="barbell-outline" text={`${last.exercise_count} exerciții`} />
                  <Meta icon="trending-up-outline" text={formatVolume(last.volume)} />
                </View>
              </Card>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function RoutineCard({
  routine,
  disabled,
  onStart,
  onEdit,
}: {
  routine: RoutineSummary;
  disabled: boolean;
  onStart: () => void;
  onEdit: () => void;
}) {
  const totalSets = routine.items.reduce((sum, i) => sum + i.set_count, 0);
  return (
    <Card style={styles.routineCard}>
      <Pressable onPress={onEdit}>
        <Text style={styles.routineName}>{routine.name}</Text>
        <Text style={styles.routineExercises} numberOfLines={2}>
          {routine.items.map((i) => i.name).join(' · ') || 'Niciun exercițiu'}
        </Text>
        <Text style={styles.routineMeta}>
          {routine.items.length} exerciții · {totalSets} seturi ·{' '}
          {routine.last_done ? `ultima dată ${formatRelativeDay(routine.last_done)}` : 'neîncepută'}
        </Text>
      </Pressable>
      <View style={styles.routineActions}>
        <Button
          title="Începe"
          icon="play"
          onPress={onStart}
          variant={disabled ? 'secondary' : 'primary'}
          style={styles.routineStart}
        />
        <Pressable onPress={onEdit} style={styles.iconBtn} hitSlop={4}>
          <Ionicons name="create-outline" size={20} color={colors.text} />
        </Pressable>
      </View>
    </Card>
  );
}

function Meta({ icon, text }: { icon: ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fullWidth: { alignSelf: 'stretch', marginTop: spacing.sm },
  startCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  startTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  startText: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  activeCard: { gap: spacing.md, borderColor: colors.accent, borderWidth: 1 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  activeLabel: { color: colors.success, fontWeight: '700', flex: 1 },
  timer: { color: colors.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  activeName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  link: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  noRoutines: { alignItems: 'center', gap: spacing.sm, borderStyle: 'dashed' },
  noRoutinesText: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  routineCard: { gap: spacing.md },
  routineName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  routineExercises: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  routineMeta: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  routineActions: { flexDirection: 'row', gap: spacing.sm },
  routineStart: { flex: 1, paddingVertical: 10 },
  iconBtn: {
    width: 46,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  lastName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  lastMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  muted: { color: colors.muted, fontSize: 14 },
});
