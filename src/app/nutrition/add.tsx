import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatKcal, MacroLine } from '@/components/nutrition';
import { EmptyState } from '@/components/ui';
import { listFoods, MEALS, type MealKey } from '@/db/nutrition';
import { normalizeName } from '@/db/queries';
import { useFocusData } from '@/hooks/useFocusData';
import { colors, radius, spacing } from '@/theme';

export default function AddFoodScreen() {
  const { day, meal } = useLocalSearchParams<{ day: string; meal: MealKey }>();
  const { data } = useFocusData(listFoods);
  const [query, setQuery] = useState('');

  const foods = useMemo(() => {
    const q = normalizeName(query);
    return (data ?? []).filter((f) => !q || normalizeName(f.name).includes(q));
  }, [data, query]);

  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? 'Adaugă';
  const flowParams = { day, meal, fromAdd: '1' };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: mealLabel }} />

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Caută în alimentele tale..."
          placeholderTextColor={colors.muted}
          autoCorrect={false}
        />
        {query !== '' && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.actions}>
        <ActionButton
          icon="add-circle-outline"
          title="Aliment nou"
          onPress={() =>
            router.push({ pathname: '/nutrition/food', params: { ...flowParams, name: query.trim() } })
          }
        />
        <ActionButton
          icon="flash-outline"
          title="Adăugare rapidă"
          onPress={() =>
            router.push({ pathname: '/nutrition/entry', params: { ...flowParams, quick: '1' } })
          }
        />
      </View>

      <FlatList
        data={foods}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          data && (
            <EmptyState
              icon="nutrition-outline"
              title={data.length === 0 ? 'Niciun aliment salvat' : 'Nimic găsit'}
              text={
                data.length === 0
                  ? 'Adaugă alimentele pe care le mănânci des, cu valorile de pe etichetă (la 100 g). Data viitoare scrii doar gramajul.'
                  : 'Creează-l ca aliment nou sau folosește adăugarea rapidă.'
              }
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/nutrition/entry',
                params: { ...flowParams, foodId: String(item.id) },
              })
            }
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.card }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {formatKcal(item.kcal)} kcal / 100 g
                {item.default_grams ? ` · porție ${item.default_grams} g` : ''}
              </Text>
              <MacroLine m={item} />
            </View>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/nutrition/food', params: { id: String(item.id) } })
              }
              hitSlop={10}
              style={styles.editBtn}
            >
              <Ionicons name="create-outline" size={20} color={colors.muted} />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

function ActionButton({
  icon,
  title,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={styles.actionText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actionText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemMeta: { color: colors.muted, fontSize: 13, marginVertical: 2 },
  editBtn: { padding: spacing.xs },
});
