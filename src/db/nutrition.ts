import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizeName } from './queries';

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

export type Food = Macros & {
  id: number;
  name: string;
  /** Typical portion, used as the default amount when logging. */
  default_grams: number | null;
  created_at: number;
  last_used_at: number | null;
};

export type FoodEntry = Macros & {
  id: number;
  day: string;
  meal: MealKey;
  food_id: number | null;
  name: string;
  /** null for quick adds (calories/macros typed in directly). */
  grams: number | null;
  created_at: number;
};

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: 'Mic dejun' },
  { key: 'lunch', label: 'Prânz' },
  { key: 'dinner', label: 'Cină' },
  { key: 'snack', label: 'Gustări' },
];

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Nutrition for `grams` of a food whose values are per 100 g. */
export function macrosFor(per100: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
  };
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    ZERO_MACROS,
  );
}

/** Energy implied by the macros (4 / 4 / 9 kcal per gram). */
export function kcalFromMacros(m: { protein: number; carbs: number; fat: number }) {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9;
}

// ---------- Targets ----------

const TARGETS_KEY = 'nutrition_targets';

export async function getTargets(db: SQLiteDatabase): Promise<Macros | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    TARGETS_KEY,
  );
  if (!row) return null;
  try {
    return { ...ZERO_MACROS, ...JSON.parse(row.value) };
  } catch {
    return null;
  }
}

export async function setTargets(db: SQLiteDatabase, targets: Macros) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    TARGETS_KEY,
    JSON.stringify(targets),
  );
}

// ---------- Foods ----------

/** Recently used foods first, then the rest alphabetically. */
export function listFoods(db: SQLiteDatabase) {
  return db.getAllAsync<Food>(
    `SELECT * FROM foods
      ORDER BY last_used_at IS NULL, last_used_at DESC, id DESC, name COLLATE NOCASE`,
  );
}

export function getFood(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Food>('SELECT * FROM foods WHERE id = ?', id);
}

/**
 * Creates (no id) or updates (with id) a food. Returns its id, or null if
 * another food already has the same name.
 */
export async function saveFood(
  db: SQLiteDatabase,
  food: Macros & { id?: number; name: string; default_grams: number | null },
) {
  const name = food.name.trim();
  const others = await db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM foods');
  const key = normalizeName(name);
  if (others.some((f) => f.id !== food.id && normalizeName(f.name) === key)) return null;

  if (food.id) {
    await db.runAsync(
      `UPDATE foods SET name = ?, kcal = ?, protein = ?, carbs = ?, fat = ?, default_grams = ?
        WHERE id = ?`,
      name,
      food.kcal,
      food.protein,
      food.carbs,
      food.fat,
      food.default_grams,
      food.id,
    );
    return food.id;
  }
  const res = await db.runAsync(
    `INSERT INTO foods (name, kcal, protein, carbs, fat, default_grams, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    name,
    food.kcal,
    food.protein,
    food.carbs,
    food.fat,
    food.default_grams,
    Date.now(),
  );
  return res.lastInsertRowId;
}

export async function deleteFood(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM foods WHERE id = ?', id);
}

// ---------- Diary entries ----------

export function getDayEntries(db: SQLiteDatabase, day: string) {
  return db.getAllAsync<FoodEntry>(
    'SELECT * FROM food_entries WHERE day = ? ORDER BY created_at, id',
    day,
  );
}

export function getEntry(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<FoodEntry>('SELECT * FROM food_entries WHERE id = ?', id);
}

export async function addFoodEntry(
  db: SQLiteDatabase,
  entry: { day: string; meal: MealKey; foodId: number; grams: number },
) {
  const food = await getFood(db, entry.foodId);
  if (!food) throw new Error(`Food ${entry.foodId} not found`);
  const m = macrosFor(food, entry.grams);
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO food_entries (day, meal, food_id, name, grams, kcal, protein, carbs, fat, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      entry.day,
      entry.meal,
      food.id,
      food.name,
      entry.grams,
      m.kcal,
      m.protein,
      m.carbs,
      m.fat,
      now,
    );
    await db.runAsync('UPDATE foods SET last_used_at = ? WHERE id = ?', now, food.id);
  });
}

export async function addQuickEntry(
  db: SQLiteDatabase,
  entry: Macros & { day: string; meal: MealKey; name: string },
) {
  await db.runAsync(
    `INSERT INTO food_entries (day, meal, food_id, name, grams, kcal, protein, carbs, fat, created_at)
     VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?)`,
    entry.day,
    entry.meal,
    entry.name.trim() || 'Adăugare rapidă',
    entry.kcal,
    entry.protein,
    entry.carbs,
    entry.fat,
    Date.now(),
  );
}

/**
 * Changes the amount of a gram-based entry. Values are scaled from the entry
 * itself, so this works even if the food was edited or deleted since.
 */
export async function updateEntryGrams(
  db: SQLiteDatabase,
  id: number,
  grams: number,
  meal: MealKey,
) {
  const e = await getEntry(db, id);
  if (!e || !e.grams) return;
  const f = grams / e.grams;
  const m = { kcal: e.kcal * f, protein: e.protein * f, carbs: e.carbs * f, fat: e.fat * f };
  await db.runAsync(
    'UPDATE food_entries SET grams = ?, meal = ?, kcal = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?',
    grams,
    meal,
    m.kcal,
    m.protein,
    m.carbs,
    m.fat,
    id,
  );
}

export async function updateQuickEntry(
  db: SQLiteDatabase,
  id: number,
  entry: Macros & { name: string; meal: MealKey },
) {
  await db.runAsync(
    'UPDATE food_entries SET name = ?, meal = ?, kcal = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?',
    entry.name.trim() || 'Adăugare rapidă',
    entry.meal,
    entry.kcal,
    entry.protein,
    entry.carbs,
    entry.fat,
    id,
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM food_entries WHERE id = ?', id);
}
