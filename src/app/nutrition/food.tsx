import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { formatKcal, NumberField } from '@/components/nutrition';
import { Button } from '@/components/ui';
import { deleteFood, getFood, kcalFromMacros, saveFood, type MealKey } from '@/db/nutrition';
import { colors, radius, spacing } from '@/theme';
import { formatWeight, parseNumber } from '@/utils/format';

export default function FoodScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    day?: string;
    meal?: MealKey;
  }>();
  const foodId = params.id ? Number(params.id) : undefined;
  const db = useSQLiteContext();
  const headerHeight = useHeaderHeight();

  const [loaded, setLoaded] = useState(!foodId);
  const [name, setName] = useState(params.name ?? '');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [portion, setPortion] = useState('');

  useEffect(() => {
    if (!foodId) return;
    getFood(db, foodId).then((f) => {
      if (f) {
        setName(f.name);
        setKcal(formatWeight(f.kcal));
        setProtein(formatWeight(f.protein));
        setCarbs(formatWeight(f.carbs));
        setFat(formatWeight(f.fat));
        setPortion(f.default_grams ? formatWeight(f.default_grams) : '');
      }
      setLoaded(true);
    });
  }, [db, foodId]);

  const macros = {
    protein: parseNumber(protein) ?? 0,
    carbs: parseNumber(carbs) ?? 0,
    fat: parseNumber(fat) ?? 0,
  };
  const derivedKcal = kcalFromMacros(macros);
  const kcalNum = parseNumber(kcal);

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Lipsește numele', 'Scrie un nume pentru aliment.');
      return;
    }
    const finalKcal = kcalNum ?? (derivedKcal > 0 ? Math.round(derivedKcal) : null);
    if (finalKcal == null) {
      Alert.alert('Lipsesc valorile', 'Completează caloriile sau macronutrienții (la 100 g).');
      return;
    }
    const portionNum = parseNumber(portion);
    const id = await saveFood(db, {
      id: foodId,
      name,
      kcal: finalKcal,
      ...macros,
      default_grams: portionNum && portionNum > 0 ? portionNum : null,
    });
    if (id == null) {
      Alert.alert('Există deja', `Ai deja un aliment numit „${name.trim()}”.`);
      return;
    }
    if (!foodId && params.day && params.meal) {
      router.replace({
        pathname: '/nutrition/entry',
        params: { foodId: String(id), day: params.day, meal: params.meal, fromAdd: '1' },
      });
    } else {
      router.back();
    }
  }

  function onDelete() {
    if (!foodId) return;
    Alert.alert('Ștergi alimentul?', 'Ce ai notat deja în jurnal rămâne neschimbat.', [
      { text: 'Nu', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          await deleteFood(db, foodId);
          router.back();
        },
      },
    ]);
  }

  if (!loaded) return <View style={styles.screen} />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <Stack.Screen options={{ title: foodId ? 'Editează alimentul' : 'Aliment nou' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nume</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="ex: Iaurt grecesc 2%"
          placeholderTextColor={colors.muted}
          autoFocus={!foodId && !params.name}
        />

        <Text style={styles.section}>Valori nutriționale la 100 g</Text>
        <Text style={styles.hint}>Le găsești pe etichetă, în coloana „100 g”.</Text>

        <NumberField
          label="Calorii"
          value={kcal}
          onChangeText={setKcal}
          suffix="kcal"
          placeholder={derivedKcal > 0 ? String(Math.round(derivedKcal)) : '0'}
        />
        <View style={styles.row}>
          <NumberField label="Proteine" value={protein} onChangeText={setProtein} suffix="g" color={colors.protein} />
          <NumberField label="Carbohidrați" value={carbs} onChangeText={setCarbs} suffix="g" color={colors.carbs} />
          <NumberField label="Grăsimi" value={fat} onChangeText={setFat} suffix="g" color={colors.fat} />
        </View>
        {derivedKcal > 0 && (
          <Text style={styles.hint}>
            {kcalNum == null
              ? `Dacă lași caloriile goale, se calculează din macro: ${formatKcal(derivedKcal)} kcal.`
              : `Din macro rezultă ~${formatKcal(derivedKcal)} kcal.`}
          </Text>
        )}

        <Text style={styles.section}>Porție obișnuită (opțional)</Text>
        <NumberField
          label="O porție are"
          value={portion}
          onChangeText={setPortion}
          suffix="g"
          placeholder="ex: 150"
        />
        <Text style={styles.hint}>Va fi cantitatea propusă când îl adaugi în jurnal.</Text>

        <Button
          title={!foodId && params.day ? 'Salvează și continuă' : 'Salvează'}
          icon="checkmark"
          onPress={onSave}
          style={{ marginTop: spacing.lg }}
        />
        {!!foodId && (
          <Button title="Șterge alimentul" icon="trash-outline" variant="danger" onPress={onDelete} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  nameInput: {
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 17,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  section: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.md },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: -spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
});
