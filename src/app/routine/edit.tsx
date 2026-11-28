import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, EmptyState } from '@/components/ui';
import { deleteRoutine, getRoutine, saveRoutine, type RoutineItem } from '@/db/queries';
import { colors, radius, spacing } from '@/theme';
import { setPickHandler } from '@/utils/exercisePicker';

type Item = RoutineItem & { key: number };

const DEFAULT_SETS = 3;
const MAX_SETS = 10;

export default function RoutineEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const routineId = id ? Number(id) : undefined;
  const db = useSQLiteContext();
  const navigation = useNavigation();

  const [loaded, setLoaded] = useState(!routineId);
  const [name, setName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const nextKey = useRef(0);

  useEffect(() => {
    if (!routineId) return;
    getRoutine(db, routineId).then((r) => {
      if (r) {
        setName(r.name);
        setItems(r.items.map((i) => ({ ...i, key: nextKey.current++ })));
      }
      setLoaded(true);
    });
  }, [db, routineId]);

  useEffect(() => {
    if (leaving) router.back();
  }, [leaving]);

  usePreventRemove(dirty && !leaving, ({ data }) => {
    Alert.alert('Renunți la modificări?', 'Ai modificări nesalvate în această rutină.', [
      { text: 'Rămân', style: 'cancel' },
      {
        text: 'Renunță',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  function update(next: Item[]) {
    setItems(next);
    setDirty(true);
  }

  function addExercise() {
    setPickHandler((e) => {
      setItems((prev) => [
        ...prev,
        {
          key: nextKey.current++,
          exercise_id: e.id,
          name: e.name,
          muscle_group: e.muscle_group,
          set_count: DEFAULT_SETS,
        },
      ]);
      setDirty(true);
    });
    router.push({ pathname: '/exercise/pick', params: { mode: 'callback' } });
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  function changeSets(index: number, delta: number) {
    update(
      items.map((it, i) =>
        i === index
          ? { ...it, set_count: Math.min(MAX_SETS, Math.max(1, it.set_count + delta)) }
          : it,
      ),
    );
  }

  async function onSave() {
    if (items.length === 0) {
      Alert.alert('Rutina e goală', 'Adaugă cel puțin un exercițiu.');
      return;
    }
    await saveRoutine(db, { id: routineId, name: name || 'Rutină', items });
    setLeaving(true);
  }

  function onDelete() {
    if (!routineId) return;
    Alert.alert('Ștergi rutina?', 'Antrenamentele făcute cu ea rămân în istoric.', [
      { text: 'Nu', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          await deleteRoutine(db, routineId);
          setLeaving(true);
        },
      },
    ]);
  }

  if (!loaded) return <View style={styles.screen} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{
          title: routineId ? 'Editează rutina' : 'Rutină nouă',
          headerRight: () => (
            <Pressable onPress={onSave} hitSlop={8} style={styles.saveBtn}>
              <Text style={styles.saveText}>Salvează</Text>
            </Pressable>
          ),
        }}
      />

      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={(t) => {
          setName(t);
          setDirty(true);
        }}
        placeholder="Numele rutinei (ex: Push, Ziua A)"
        placeholderTextColor={colors.muted}
        autoFocus={!routineId}
      />

      {items.length === 0 && (
        <EmptyState
          icon="list-outline"
          title="Niciun exercițiu"
          text="Adaugă exercițiile în ordinea în care le faci și câte seturi vrei pentru fiecare."
        />
      )}

      {items.map((it, i) => (
        <Card key={it.key} style={styles.item}>
          <View style={styles.itemTop}>
            <View style={styles.order}>
              <Pressable onPress={() => move(i, -1)} hitSlop={6} disabled={i === 0}>
                <Ionicons
                  name="chevron-up"
                  size={20}
                  color={i === 0 ? colors.border : colors.muted}
                />
              </Pressable>
              <Pressable onPress={() => move(i, 1)} hitSlop={6} disabled={i === items.length - 1}>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={i === items.length - 1 ? colors.border : colors.muted}
                />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.name}</Text>
              <Text style={styles.itemGroup}>{it.muscle_group}</Text>
            </View>
            <Pressable onPress={() => update(items.filter((_, j) => j !== i))} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.setsRow}>
            <Text style={styles.setsLabel}>Seturi</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => changeSets(i, -1)}
                style={styles.stepBtn}
                disabled={it.set_count <= 1}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <Text style={styles.stepValue}>{it.set_count}</Text>
              <Pressable
                onPress={() => changeSets(i, 1)}
                style={styles.stepBtn}
                disabled={it.set_count >= MAX_SETS}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>
        </Card>
      ))}

      <Button title="Adaugă exercițiu" icon="add-circle" variant="secondary" onPress={addExercise} />
      <Button title="Salvează rutina" icon="checkmark" onPress={onSave} />
      {!!routineId && (
        <Button title="Șterge rutina" icon="trash-outline" variant="danger" onPress={onDelete} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  saveText: { color: colors.accentText, fontWeight: '800' },
  nameInput: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    paddingVertical: spacing.xs,
  },
  item: { padding: spacing.md, gap: spacing.md },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  order: { gap: 2 },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  itemGroup: { color: colors.muted, fontSize: 13, marginTop: 2 },
  setsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 32,
  },
  setsLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
});
