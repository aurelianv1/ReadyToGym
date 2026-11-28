import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';

import { MEALS, type Macros, type MealKey } from '@/db/nutrition';
import { colors, radius, spacing } from '@/theme';
import { formatGrams } from '@/utils/format';

export const MACRO_INFO = [
  { key: 'protein', label: 'Proteine', short: 'P', color: colors.protein },
  { key: 'carbs', label: 'Carbohidrați', short: 'C', color: colors.carbs },
  { key: 'fat', label: 'Grăsimi', short: 'G', color: colors.fat },
] as const;

export function formatKcal(kcal: number) {
  return Math.round(kcal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function ProgressBar({
  value,
  target,
  color,
  height = 8,
}: {
  value: number;
  target: number | null;
  color: string;
  height?: number;
}) {
  const ratio = target ? Math.min(1, value / target) : 0;
  const over = !!target && value > target * 1.05;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${ratio * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: over ? colors.danger : color,
        }}
      />
    </View>
  );
}

export function MacroBar({
  label,
  value,
  target,
  color,
  highlight,
}: {
  label: string;
  value: number;
  target: number | null;
  color: string;
  highlight?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.macroRow}>
        <Text style={[styles.macroLabel, highlight && styles.macroLabelHighlight]}>{label}</Text>
        <Text style={[styles.macroValue, highlight && styles.macroValueHighlight]}>
          {formatGrams(value)}
          {target ? <Text style={styles.macroTarget}> / {formatGrams(target)} g</Text> : ' g'}
        </Text>
      </View>
      <ProgressBar value={value} target={target} color={color} height={highlight ? 10 : 6} />
    </View>
  );
}

export function MacroLine({ m, style }: { m: Macros; style?: object }) {
  return (
    <Text style={[styles.macroLine, style]}>
      {MACRO_INFO.map((info, i) => (
        <Text key={info.key}>
          {i > 0 && <Text style={styles.dot}> · </Text>}
          <Text style={{ color: info.color, fontWeight: '700' }}>{info.short}</Text>{' '}
          {formatGrams(m[info.key])}
        </Text>
      ))}
    </Text>
  );
}

export function NumberField({
  label,
  value,
  onChangeText,
  suffix,
  placeholder,
  color,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  suffix?: string;
  placeholder?: string;
  color?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, color ? { color } : null]}>{label}</Text>
      <View style={styles.fieldBox}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder ?? '0'}
          placeholderTextColor={colors.muted}
          selectTextOnFocus
          autoFocus={autoFocus}
          maxLength={7}
        />
        {suffix && <Text style={styles.fieldSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

export function MealPicker({ value, onChange }: { value: MealKey; onChange: (m: MealKey) => void }) {
  return (
    <View style={styles.meals}>
      {MEALS.map((m) => (
        <Pressable
          key={m.key}
          onPress={() => onChange(m.key)}
          style={[styles.mealChip, value === m.key && styles.mealChipActive]}
        >
          <Text style={[styles.mealChipText, value === m.key && styles.mealChipTextActive]}>
            {m.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.cardAlt, overflow: 'hidden' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  macroLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  macroLabelHighlight: { color: colors.text, fontSize: 16, fontWeight: '800' },
  macroValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  macroValueHighlight: { fontSize: 16, fontWeight: '800' },
  macroTarget: { color: colors.muted, fontWeight: '500' },
  macroLine: { color: colors.muted, fontSize: 13 },
  dot: { color: colors.border },
  field: { flex: 1, gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  fieldInput: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700', paddingVertical: 12 },
  fieldSuffix: { color: colors.muted, fontSize: 14, marginLeft: spacing.xs },
  meals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mealChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  mealChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  mealChipText: { color: colors.text, fontWeight: '600' },
  mealChipTextActive: { color: colors.accentText },
});
