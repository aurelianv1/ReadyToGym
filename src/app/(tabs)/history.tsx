import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState } from '@/components/ui';
import { listWorkouts } from '@/db/queries';
import { useFocusData } from '@/hooks/useFocusData';
import { colors, spacing } from '@/theme';
import { formatDate, formatDuration, formatTime, formatVolume } from '@/utils/format';

export default function HistoryScreen() {
  const { data } = useFocusData(listWorkouts);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(w) => String(w.id)}
      ListEmptyComponent={
        data && (
          <EmptyState
            icon="calendar-outline"
            title="Niciun antrenament încă"
            text="Antrenamentele terminate vor apărea aici."
          />
        )
      }
      renderItem={({ item: w }) => (
        <Pressable onPress={() => router.push(`/workout/${w.id}`)}>
          {({ pressed }) => (
            <Card style={pressed && { opacity: 0.7 }}>
              <View style={styles.titleRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {w.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
              <Text style={styles.date}>
                {formatDate(w.started_at)} · {formatTime(w.started_at)}
              </Text>
              <View style={styles.meta}>
                <Meta icon="time-outline" text={formatDuration((w.finished_at ?? 0) - w.started_at)} />
                <Meta icon="barbell-outline" text={`${w.exercise_count} exerciții`} />
                <Meta icon="layers-outline" text={`${w.set_count} seturi`} />
                <Meta icon="trending-up-outline" text={formatVolume(w.volume)} />
              </View>
            </Card>
          )}
        </Pressable>
      )}
    />
  );
}

function Meta({ icon, text }: { icon: ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  date: { color: colors.muted, fontSize: 14, marginTop: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: colors.muted, fontSize: 14 },
});
