import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Stat } from '@/components/ui';
import { deleteExercise, getExercise, getExerciseHistory, type ExerciseSession } from '@/db/queries';
import { useFocusData } from '@/hooks/useFocusData';
import { colors, radius, spacing } from '@/theme';
import { estimate1RM, formatDate, formatSet, formatShortDate, formatWeight } from '@/utils/format';

const CHART_SESSIONS = 10;
const CHART_HEIGHT = 140;

export default function ExerciseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = Number(id);

  const { data, db } = useFocusData(
    async (db) => {
      const [exercise, history] = await Promise.all([
        getExercise(db, exerciseId),
        getExerciseHistory(db, exerciseId),
      ]);
      return { exercise, history };
    },
    [exerciseId],
  );

  if (!data) return <View style={styles.screen} />;
  const { exercise, history } = data;
  if (!exercise) return <View style={styles.screen} />;

  const allSets = history.flatMap((h) => h.sets);
  const best = allSets.reduce<(typeof allSets)[number] | null>(
    (acc, s) =>
      !acc || (s.weight ?? 0) > (acc.weight ?? 0) ||
      ((s.weight ?? 0) === (acc.weight ?? 0) && (s.reps ?? 0) > (acc.reps ?? 0))
        ? s
        : acc,
    null,
  );
  const best1RM = Math.max(0, ...allSets.map((s) => estimate1RM(s.weight, s.reps)));

  function onDelete() {
    Alert.alert(
      'Ștergi exercițiul?',
      history.length > 0
        ? `Se va șterge și tot istoricul lui (${history.length} sesiuni).`
        : 'Acțiunea nu poate fi anulată.',
      [
        { text: 'Nu', style: 'cancel' },
        {
          text: 'Șterge',
          style: 'destructive',
          onPress: async () => {
            await deleteExercise(db, exerciseId);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: exercise.muscle_group }} />
      <Text style={styles.title}>{exercise.name}</Text>

      {history.length === 0 ? (
        <EmptyState
          icon="stats-chart-outline"
          title="Fără istoric încă"
          text="După ce faci acest exercițiu într-un antrenament, aici vei vedea recordurile și progresul."
        />
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="Record" value={best ? formatSet(best.weight, best.reps) : '—'} />
            <Stat label="1RM estimat" value={best1RM ? `${formatWeight(Math.round(best1RM))} kg` : '—'} />
            <Stat label="Sesiuni" value={String(history.length)} />
          </View>

          <Card>
            <Text style={styles.sectionTitle}>Greutate maximă pe sesiune</Text>
            <ProgressChart sessions={history.slice(0, CHART_SESSIONS).reverse()} />
          </Card>

          <Text style={styles.sectionTitle}>Istoric</Text>
          {history.map((h) => (
            <Pressable key={h.workout_id} onPress={() => router.push(`/workout/${h.workout_id}`)}>
              <Card>
                <Text style={styles.sessionDate}>{formatDate(h.started_at)}</Text>
                <View style={styles.sessionSets}>
                  {h.sets.map((s) => (
                    <View key={s.id} style={styles.setPill}>
                      <Text style={styles.setPillText}>{formatSet(s.weight, s.reps)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      {!!exercise.is_custom && (
        <Button title="Șterge exercițiul" icon="trash-outline" variant="danger" onPress={onDelete} />
      )}
    </ScrollView>
  );
}

function ProgressChart({ sessions }: { sessions: ExerciseSession[] }) {
  const points = sessions.map((s) => ({
    label: formatShortDate(s.started_at),
    value: Math.max(0, ...s.sets.map((x) => x.weight ?? 0)),
  }));
  const max = Math.max(1, ...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const floor = points.length > 1 ? Math.max(0, min - (max - min) * 0.5 - 1) : 0;

  return (
    <View style={styles.chart}>
      {points.map((p, i) => {
        const h = ((p.value - floor) / (max - floor)) * CHART_HEIGHT;
        const isLast = i === points.length - 1;
        return (
          <View key={i} style={styles.barCol}>
            <Text style={styles.barValue} numberOfLines={1}>
              {formatWeight(p.value)}
            </Text>
            <View
              style={[
                styles.bar,
                { height: Math.max(4, h), backgroundColor: isLast ? colors.accent : colors.cardAlt },
              ]}
            />
            <Text style={styles.barLabel} numberOfLines={1}>
              {p.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingTop: spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', maxWidth: 28, borderRadius: radius.sm / 2 },
  barValue: { color: colors.text, fontSize: 11, fontWeight: '700' },
  barLabel: { color: colors.muted, fontSize: 10 },
  sessionDate: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  sessionSets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  setPill: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  setPillText: { color: colors.text, fontSize: 14 },
});
