import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Exercise } from '@/db/queries';
import { MUSCLE_GROUPS, normalizeName as normalize } from '@/db/queries';
import { colors, radius, spacing } from '@/theme';

type Props = {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onCreate: (name: string) => void;
};

/** Searchable, filterable list of exercises — used by the Exercises tab and the picker. */
export function ExerciseList({ exercises, onSelect, onCreate }: Props) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return exercises.filter(
      (e) => (!group || e.muscle_group === group) && (!q || normalize(e.name).includes(q)),
    );
  }, [exercises, query, group]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Caută exercițiu..."
          placeholderTextColor={colors.muted}
          autoCorrect={false}
        />
        {query !== '' && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {[null, ...MUSCLE_GROUPS].map((g) => {
          const active = group === g;
          return (
            <Pressable
              key={g ?? 'all'}
              onPress={() => setGroup(g)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{g ?? 'Toate'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Pressable style={styles.createRow} onPress={() => onCreate(query.trim())}>
            <Ionicons name="add-circle" size={22} color={colors.accent} />
            <Text style={styles.createText}>
              {query.trim() ? `Creează „${query.trim()}”` : 'Creează exercițiu nou'}
            </Text>
          </Pressable>
        }
        ListEmptyComponent={<Text style={styles.empty}>Niciun exercițiu găsit.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.card }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemGroup}>
                {item.muscle_group}
                {item.is_custom ? ' · creat de tine' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.border} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
  chipsScroll: { flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: colors.accentText },
  list: { paddingBottom: 40 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  createText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemGroup: { color: colors.muted, fontSize: 13, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
});
