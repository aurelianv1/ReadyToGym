import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatKcal, MACRO_INFO, MacroBar, MacroLine, ProgressBar } from '@/components/nutrition';
import { Card } from '@/components/ui';
import { getDayEntries, getTargets, MEALS, sumMacros, type FoodEntry } from '@/db/nutrition';
import { useFocusData } from '@/hooks/useFocusData';
import { colors, radius, spacing } from '@/theme';
import { dayKey, formatDayLabel, formatGrams, shiftDay } from '@/utils/format';

export default function NutritionScreen() {
  const [day, setDay] = useState(dayKey());

  const { data } = useFocusData(
    async (db) => {
      const [entries, targets] = await Promise.all([getDayEntries(db, day), getTargets(db)]);
      return { day, entries, targets };
    },
    [day],
  );

  // Avoid flashing the previous day's numbers while the new day loads.
  const entries = data?.day === day ? data.entries : [];
  const targets = data?.targets ?? null;
  const total = sumMacros(entries);
  const remaining = targets ? targets.kcal - total.kcal : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.dayRow}>
        <Pressable onPress={() => setDay(shiftDay(day, -1))} hitSlop={10} style={styles.dayBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setDay(dayKey())}>
          <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
        </Pressable>
        <Pressable onPress={() => setDay(shiftDay(day, 1))} hitSlop={10} style={styles.dayBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <Card style={styles.summary}>
        <View style={styles.kcalRow}>
          <View>
            <Text style={styles.kcalValue}>
              {formatKcal(total.kcal)}
              {targets && <Text style={styles.kcalTarget}> / {formatKcal(targets.kcal)}</Text>}
            </Text>
            <Text style={styles.kcalLabel}>kcal consumate</Text>
          </View>
          {remaining != null && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.remaining, remaining < 0 && { color: colors.danger }]}>
                {formatKcal(Math.abs(remaining))}
              </Text>
              <Text style={styles.kcalLabel}>{remaining >= 0 ? 'rămase' : 'peste țintă'}</Text>
            </View>
          )}
        </View>
        {targets && <ProgressBar value={total.kcal} target={targets.kcal} color={colors.accent} height={10} />}

        <View style={styles.macros}>
          {MACRO_INFO.map((info) => (
            <MacroBar
              key={info.key}
              label={info.label}
              value={total[info.key]}
              target={targets ? targets[info.key] : null}
              color={info.color}
              highlight={info.key === 'protein'}
            />
          ))}
        </View>

        {!targets && (
          <Pressable onPress={() => router.push('/nutrition/targets')} style={styles.setTargets}>
            <Ionicons name="flag-outline" size={16} color={colors.accent} />
            <Text style={styles.link}>Setează-ți țintele zilnice</Text>
          </Pressable>
        )}
      </Card>

      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal.key);
        const mealKcal = items.reduce((s, e) => s + e.kcal, 0);
        return (
          <Card key={meal.key} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{meal.label}</Text>
              {items.length > 0 && <Text style={styles.mealKcal}>{formatKcal(mealKcal)} kcal</Text>}
            </View>

            {items.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}

            <Pressable
              onPress={() =>
                router.push({ pathname: '/nutrition/add', params: { day, meal: meal.key } })
              }
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="add" size={18} color={colors.accent} />
              <Text style={styles.link}>Adaugă</Text>
            </Pressable>
          </Card>
        );
      })}
    </ScrollView>
  );
}

function EntryRow({ entry }: { entry: FoodEntry }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/nutrition/entry', params: { entryId: String(entry.id) } })
      }
      style={({ pressed }) => [styles.entry, pressed && { opacity: 0.6 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.entryName} numberOfLines={1}>
          {entry.name}
        </Text>
        <MacroLine m={entry} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.entryKcal}>{formatKcal(entry.kcal)}</Text>
        <Text style={styles.entryGrams}>
          {entry.grams != null ? `${formatGrams(entry.grams)} g` : 'rapid'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { color: colors.text, fontSize: 18, fontWeight: '800' },
  summary: { gap: spacing.md },
  kcalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  kcalValue: { color: colors.text, fontSize: 30, fontWeight: '800' },
  kcalTarget: { color: colors.muted, fontSize: 18, fontWeight: '600' },
  kcalLabel: { color: colors.muted, fontSize: 13 },
  remaining: { color: colors.success, fontSize: 22, fontWeight: '800' },
  macros: { gap: spacing.md, marginTop: spacing.xs },
  setTargets: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  link: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  mealCard: { gap: spacing.xs, paddingBottom: spacing.sm },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  mealTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  mealKcal: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  entryName: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  entryKcal: { color: colors.text, fontSize: 15, fontWeight: '800' },
  entryGrams: { color: colors.muted, fontSize: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
