import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatKcal, NumberField } from '@/components/nutrition';
import { Button } from '@/components/ui';
import { getTargets, kcalFromMacros, setTargets } from '@/db/nutrition';
import { colors, spacing } from '@/theme';
import { formatWeight, parseNumber } from '@/utils/format';

export default function TargetsScreen() {
  const db = useSQLiteContext();
  const headerHeight = useHeaderHeight();
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    getTargets(db).then((t) => {
      if (!t) return;
      setKcal(formatWeight(t.kcal));
      setProtein(formatWeight(t.protein));
      setCarbs(formatWeight(t.carbs));
      setFat(formatWeight(t.fat));
    });
  }, [db]);

  const macros = {
    protein: parseNumber(protein) ?? 0,
    carbs: parseNumber(carbs) ?? 0,
    fat: parseNumber(fat) ?? 0,
  };
  const derived = Math.round(kcalFromMacros(macros));
  const kcalNum = parseNumber(kcal);
  const mismatch = kcalNum != null && derived > 0 && Math.abs(derived - kcalNum) > 50;

  async function onSave() {
    const finalKcal = kcalNum ?? (derived > 0 ? derived : null);
    if (!finalKcal) {
      Alert.alert('Lipsește ținta de calorii', 'Completează caloriile sau macronutrienții.');
      return;
    }
    await setTargets(db, { kcal: finalKcal, ...macros });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Cât vrei să mănânci pe zi. Le poți schimba oricând, de exemplu când treci de la masă la
          definire.
        </Text>

        <NumberField label="Calorii" value={kcal} onChangeText={setKcal} suffix="kcal/zi" placeholder={derived > 0 ? String(derived) : 'ex: 2500'} />
        <NumberField label="Proteine" value={protein} onChangeText={setProtein} suffix="g/zi" color={colors.protein} placeholder="ex: 160" />
        <View style={styles.row}>
          <NumberField label="Carbohidrați" value={carbs} onChangeText={setCarbs} suffix="g" color={colors.carbs} />
          <NumberField label="Grăsimi" value={fat} onChangeText={setFat} suffix="g" color={colors.fat} />
        </View>

        {derived > 0 && (
          <View style={styles.derived}>
            <Text style={[styles.hint, mismatch && { color: colors.carbs }]}>
              Macro-urile însumează {formatKcal(derived)} kcal
              {mismatch ? `, diferit de ținta de ${formatKcal(kcalNum!)} kcal.` : '.'}
            </Text>
            {mismatch && (
              <Pressable onPress={() => setKcal(String(derived))} hitSlop={6}>
                <Text style={styles.link}>Folosește {formatKcal(derived)} kcal</Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={styles.hint}>
          Orientativ pentru sală: 1,6–2,2 g proteine pe kg de greutate corporală.
        </Text>

        <Button title="Salvează țintele" icon="checkmark" onPress={onSave} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  intro: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', gap: spacing.sm },
  derived: { gap: spacing.xs },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  link: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
