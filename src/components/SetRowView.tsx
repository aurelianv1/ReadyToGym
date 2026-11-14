import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SetRow } from '@/db/queries';
import { colors, radius, spacing } from '@/theme';
import { formatWeight, parseNumber } from '@/utils/format';

export type SetValues = { weight: number | null; reps: number | null; done: boolean };

type Props = {
  index: number;
  set: SetRow;
  /** The matching set from the last session (shown in the "Anterior" column). */
  previous?: SetRow;
  /** Suggested values used when the set is ticked with empty fields. */
  suggestion: { weight: number | null; reps: number | null } | null;
  onChange: (values: SetValues) => void;
  onDelete: () => void;
};

export const SET_COLUMNS = { set: 34, kg: 68, reps: 56, check: 44 };

export function SetRowView({ index, set, previous, suggestion, onChange, onDelete }: Props) {
  const [weight, setWeight] = useState(set.weight != null ? formatWeight(set.weight) : '');
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : '');
  const [done, setDone] = useState(!!set.done);

  function emit(w: string, r: string, d: boolean) {
    const repsNum = parseNumber(r);
    onChange({
      weight: parseNumber(w),
      reps: repsNum == null ? null : Math.round(repsNum),
      done: d,
    });
  }

  function toggleDone() {
    if (done) {
      setDone(false);
      emit(weight, reps, false);
      return;
    }
    let w = weight;
    let r = reps;
    if (w === '' && suggestion?.weight != null) w = formatWeight(suggestion.weight);
    if (r === '' && suggestion?.reps != null) r = String(suggestion.reps);
    if (r === '') return; // nothing to record yet
    setWeight(w);
    setReps(r);
    setDone(true);
    emit(w, r, true);
  }

  const prevText = previous?.reps != null
    ? previous.weight
      ? `${formatWeight(previous.weight)} × ${previous.reps}`
      : `${previous.reps} rep.`
    : '—';

  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <Pressable onLongPress={onDelete} style={styles.setCell} hitSlop={6}>
        <Text style={styles.setNumber}>{index + 1}</Text>
      </Pressable>
      <Text style={styles.prev} numberOfLines={1}>
        {prevText}
      </Text>
      <TextInput
        style={[styles.input, { width: SET_COLUMNS.kg }]}
        value={weight}
        onChangeText={(t) => {
          setWeight(t);
          emit(t, reps, done);
        }}
        placeholder={suggestion?.weight != null ? formatWeight(suggestion.weight) : 'kg'}
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        selectTextOnFocus
        maxLength={6}
      />
      <TextInput
        style={[styles.input, { width: SET_COLUMNS.reps }]}
        value={reps}
        onChangeText={(t) => {
          setReps(t);
          emit(weight, t, done);
        }}
        placeholder={suggestion?.reps != null ? String(suggestion.reps) : 'rep'}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        selectTextOnFocus
        maxLength={3}
      />
      <Pressable onPress={toggleDone} style={styles.checkCell} hitSlop={6}>
        <View style={[styles.check, done && styles.checkDone]}>
          <Ionicons name="checkmark" size={20} color={done ? colors.bg : colors.muted} />
        </View>
      </Pressable>
    </View>
  );
}

export function SetHeader() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.headerText, { width: SET_COLUMNS.set, textAlign: 'center' }]}>SET</Text>
      <Text style={[styles.headerText, styles.prevHeader]}>ANTERIOR</Text>
      <Text style={[styles.headerText, { width: SET_COLUMNS.kg, textAlign: 'center' }]}>KG</Text>
      <Text style={[styles.headerText, { width: SET_COLUMNS.reps, textAlign: 'center' }]}>REP.</Text>
      <View style={{ width: SET_COLUMNS.check }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  rowDone: { backgroundColor: colors.successBg },
  headerRow: { paddingVertical: 2 },
  headerText: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  prevHeader: { flex: 1 },
  setCell: { width: SET_COLUMNS.set, alignItems: 'center' },
  setNumber: { color: colors.text, fontWeight: '800', fontSize: 16 },
  prev: { flex: 1, color: colors.muted, fontSize: 14 },
  input: {
    backgroundColor: colors.cardAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  checkCell: { width: SET_COLUMNS.check, alignItems: 'center' },
  check: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success },
});
