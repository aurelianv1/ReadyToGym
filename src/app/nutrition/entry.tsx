import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
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

import { formatKcal, MACRO_INFO, MealPicker, NumberField } from '@/components/nutrition';
import { Button, Card } from '@/components/ui';
import {
  addFoodEntry,
  addQuickEntry,
  deleteEntry,
  getEntry,
  getFood,
  kcalFromMacros,
  macrosFor,
  updateEntryGrams,
  updateQuickEntry,
  ZERO_MACROS,
  type Macros,
  type MealKey,
} from '@/db/nutrition';
import { colors, radius, spacing } from '@/theme';
import { formatGrams, formatWeight, parseNumber } from '@/utils/format';

type Params = {
  entryId?: string; // edit an existing diary entry
  foodId?: string; // log an amount of a saved food
  quick?: string; // quick add (calories/macros typed in)
  day?: string;
  meal?: MealKey;
  fromAdd?: string; // opened from the add screen -> close both when done
};

type Mode =
  | { kind: 'loading' }
  | { kind: 'food'; name: string; per100: Macros; defaultGrams: number | null }
  | { kind: 'editGrams'; name: string; base: Macros; baseGrams: number }
  | { kind: 'quick'; editing: boolean };

export default function EntryScreen() {
  const params = useLocalSearchParams<Params>();
  const db = useSQLiteContext();
  const headerHeight = useHeaderHeight();
  const entryId = params.entryId ? Number(params.entryId) : undefined;

  const [mode, setMode] = useState<Mode>(
    params.quick ? { kind: 'quick', editing: false } : { kind: 'loading' },
  );
  const [meal, setMeal] = useState<MealKey>(params.meal ?? 'snack');
  const [grams, setGrams] = useState('');
  const [quick, setQuick] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    (async () => {
      if (entryId) {
        const e = await getEntry(db, entryId);
        if (!e) return router.back();
        setMeal(e.meal);
        if (e.grams != null) {
          setGrams(formatWeight(e.grams));
          setMode({ kind: 'editGrams', name: e.name, base: e, baseGrams: e.grams });
        } else {
          setQuick({
            name: e.name,
            kcal: formatWeight(Math.round(e.kcal)),
            protein: formatWeight(e.protein),
            carbs: formatWeight(e.carbs),
            fat: formatWeight(e.fat),
          });
          setMode({ kind: 'quick', editing: true });
        }
      } else if (params.foodId) {
        const f = await getFood(db, Number(params.foodId));
        if (!f) return router.back();
        setGrams(formatWeight(f.default_grams ?? 100));
        setMode({ kind: 'food', name: f.name, per100: f, defaultGrams: f.default_grams });
      }
    })();
  }, [db, entryId, params.foodId]);

  function close() {
    if (params.fromAdd) router.dismiss(2);
    else router.back();
  }

  const gramsNum = parseNumber(grams) ?? 0;
  const preview: Macros =
    mode.kind === 'food'
      ? macrosFor(mode.per100, gramsNum)
      : mode.kind === 'editGrams'
        ? macrosFor(mode.base, (gramsNum / mode.baseGrams) * 100)
        : ZERO_MACROS;

  const quickMacros = {
    protein: parseNumber(quick.protein) ?? 0,
    carbs: parseNumber(quick.carbs) ?? 0,
    fat: parseNumber(quick.fat) ?? 0,
  };
  const quickDerivedKcal = kcalFromMacros(quickMacros);

  async function onSave() {
    if (mode.kind === 'food' || mode.kind === 'editGrams') {
      if (gramsNum <= 0) {
        Alert.alert('Cantitate lipsă', 'Scrie câte grame ai mâncat.');
        return;
      }
      if (mode.kind === 'food') {
        await addFoodEntry(db, {
          day: params.day!,
          meal,
          foodId: Number(params.foodId),
          grams: gramsNum,
        });
      } else {
        await updateEntryGrams(db, entryId!, gramsNum, meal);
      }
    } else if (mode.kind === 'quick') {
      const kcal = parseNumber(quick.kcal) ?? (quickDerivedKcal > 0 ? Math.round(quickDerivedKcal) : null);
      if (kcal == null) {
        Alert.alert('Lipsesc caloriile', 'Completează caloriile sau macronutrienții.');
        return;
      }
      const values = { name: quick.name, meal, kcal, ...quickMacros };
      if (mode.editing) await updateQuickEntry(db, entryId!, values);
      else await addQuickEntry(db, { ...values, day: params.day! });
    }
    close();
  }

  function onDelete() {
    if (!entryId) return;
    Alert.alert('Ștergi din jurnal?', undefined, [
      { text: 'Nu', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, entryId);
          router.back();
        },
      },
    ]);
  }

  if (mode.kind === 'loading') return <View style={styles.screen} />;

  const title =
    mode.kind === 'quick'
      ? mode.editing
        ? 'Editează'
        : 'Adăugare rapidă'
      : mode.kind === 'food'
        ? 'Cât ai mâncat?'
        : 'Editează';

  const portionOptions =
    mode.kind === 'food' || mode.kind === 'editGrams'
      ? Array.from(
          new Set([
            ...(mode.kind === 'food' && mode.defaultGrams ? [mode.defaultGrams] : []),
            50,
            100,
            150,
            200,
          ]),
        )
      : [];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {mode.kind !== 'quick' ? (
          <>
            <Text style={styles.foodName}>{mode.name}</Text>

            <View style={styles.gramsBox}>
              <TextInput
                style={styles.gramsInput}
                value={grams}
                onChangeText={setGrams}
                keyboardType="decimal-pad"
                selectTextOnFocus
                autoFocus
                maxLength={6}
              />
              <Text style={styles.gramsSuffix}>g</Text>
            </View>

            <View style={styles.portions}>
              {portionOptions.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGrams(formatWeight(g))}
                  style={[styles.portion, gramsNum === g && styles.portionActive]}
                >
                  <Text style={[styles.portionText, gramsNum === g && styles.portionTextActive]}>
                    {mode.kind === 'food' && g === mode.defaultGrams ? `1 porție (${g} g)` : `${g} g`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Card style={styles.preview}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.previewKcal}>{formatKcal(preview.kcal)}</Text>
                <Text style={styles.previewLabel}>kcal</Text>
              </View>
              <View style={styles.previewMacros}>
                {MACRO_INFO.map((info) => (
                  <View key={info.key} style={styles.previewMacro}>
                    <Text style={[styles.previewMacroValue, { color: info.color }]}>
                      {formatGrams(preview[info.key])} g
                    </Text>
                    <Text style={styles.previewLabel}>{info.label}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        ) : (
          <>
            <Text style={styles.label}>Ce ai mâncat (opțional)</Text>
            <TextInput
              style={styles.nameInput}
              value={quick.name}
              onChangeText={(t) => setQuick({ ...quick, name: t })}
              placeholder="ex: Shaorma, meniul zilei"
              placeholderTextColor={colors.muted}
            />
            <NumberField
              label="Calorii"
              value={quick.kcal}
              onChangeText={(t) => setQuick({ ...quick, kcal: t })}
              suffix="kcal"
              placeholder={quickDerivedKcal > 0 ? String(Math.round(quickDerivedKcal)) : '0'}
              autoFocus={!mode.editing}
            />
            <View style={styles.row}>
              <NumberField
                label="Proteine"
                value={quick.protein}
                onChangeText={(t) => setQuick({ ...quick, protein: t })}
                suffix="g"
                color={colors.protein}
              />
              <NumberField
                label="Carbohidrați"
                value={quick.carbs}
                onChangeText={(t) => setQuick({ ...quick, carbs: t })}
                suffix="g"
                color={colors.carbs}
              />
              <NumberField
                label="Grăsimi"
                value={quick.fat}
                onChangeText={(t) => setQuick({ ...quick, fat: t })}
                suffix="g"
                color={colors.fat}
              />
            </View>
            {quickDerivedKcal > 0 && parseNumber(quick.kcal) == null && (
              <Text style={styles.hint}>
                Dacă lași caloriile goale, se calculează din macro: {formatKcal(quickDerivedKcal)} kcal.
              </Text>
            )}
          </>
        )}

        <Text style={styles.label}>Masa</Text>
        <MealPicker value={meal} onChange={setMeal} />

        <Button
          title={entryId ? 'Salvează' : 'Adaugă în jurnal'}
          icon="checkmark"
          onPress={onSave}
          style={{ marginTop: spacing.md }}
        />
        {!!entryId && (
          <Button title="Șterge din jurnal" icon="trash-outline" variant="danger" onPress={onDelete} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  foodName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  gramsBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
  },
  gramsInput: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    minWidth: 100,
    textAlign: 'center',
  },
  gramsSuffix: { color: colors.muted, fontSize: 22, fontWeight: '700' },
  portions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  portion: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  portionActive: { borderColor: colors.accent },
  portionText: { color: colors.text, fontWeight: '600' },
  portionTextActive: { color: colors.accent },
  preview: { gap: spacing.md },
  previewKcal: { color: colors.text, fontSize: 32, fontWeight: '800' },
  previewLabel: { color: colors.muted, fontSize: 12 },
  previewMacros: { flexDirection: 'row', justifyContent: 'space-around' },
  previewMacro: { alignItems: 'center' },
  previewMacroValue: { fontSize: 18, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: spacing.xs },
  nameInput: {
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 17,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
