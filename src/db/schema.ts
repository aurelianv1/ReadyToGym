import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 3;

const SEED_EXERCISES: [name: string, muscleGroup: string][] = [
  ['Împins la piept cu haltera (Bench Press)', 'Piept'],
  ['Împins înclinat cu haltera', 'Piept'],
  ['Împins la piept cu gantere', 'Piept'],
  ['Împins înclinat cu gantere', 'Piept'],
  ['Fluturări cu gantere', 'Piept'],
  ['Crossover la scripete', 'Piept'],
  ['Flotări la paralele (Dips)', 'Piept'],

  ['Tracțiuni la bară', 'Spate'],
  ['Tragere la helcometru (Lat Pulldown)', 'Spate'],
  ['Ramat cu haltera', 'Spate'],
  ['Ramat cu gantera', 'Spate'],
  ['Ramat la cablu din șezut', 'Spate'],
  ['Îndreptări (Deadlift)', 'Spate'],

  ['Genuflexiuni cu haltera (Squat)', 'Picioare'],
  ['Presă pentru picioare (Leg Press)', 'Picioare'],
  ['Fandări cu gantere', 'Picioare'],
  ['Îndreptări românești (RDL)', 'Picioare'],
  ['Extensii pentru cvadriceps', 'Picioare'],
  ['Flexii pentru femurali', 'Picioare'],
  ['Hip Thrust', 'Picioare'],
  ['Ridicări pe vârfuri (gambe)', 'Picioare'],

  ['Împins deasupra capului (OHP)', 'Umeri'],
  ['Împins cu gantere pentru umeri', 'Umeri'],
  ['Ridicări laterale cu gantere', 'Umeri'],
  ['Ridicări frontale', 'Umeri'],
  ['Face Pull', 'Umeri'],

  ['Flexii cu haltera (biceps)', 'Brațe'],
  ['Flexii cu gantere (biceps)', 'Brațe'],
  ['Flexii ciocan (Hammer Curl)', 'Brațe'],
  ['Extensii triceps la scripete', 'Brațe'],
  ['Extensii franceze (Skull Crusher)', 'Brațe'],
  ['Împins cu priză îngustă', 'Brațe'],

  ['Plank', 'Abdomen'],
  ['Abdomene (Crunch)', 'Abdomen'],
  ['Ridicări de picioare la bară', 'Abdomen'],
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        muscle_group TEXT NOT NULL,
        is_custom INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER
      );

      CREATE TABLE workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        position INTEGER NOT NULL
      );

      CREATE TABLE sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        weight REAL,
        reps INTEGER,
        done INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX idx_we_workout ON workout_exercises(workout_id);
      CREATE INDEX idx_we_exercise ON workout_exercises(exercise_id);
      CREATE INDEX idx_sets_we ON sets(workout_exercise_id);
    `);

    for (const [name, group] of SEED_EXERCISES) {
      await db.runAsync('INSERT INTO exercises (name, muscle_group) VALUES (?, ?)', name, group);
    }
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    await db.execAsync(`
      CREATE TABLE routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE routine_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        set_count INTEGER NOT NULL DEFAULT 3
      );

      CREATE INDEX idx_re_routine ON routine_exercises(routine_id);

      ALTER TABLE workouts ADD COLUMN routine_id INTEGER REFERENCES routines(id) ON DELETE SET NULL;
    `);
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    await db.execAsync(`
      -- Saved foods; nutrition values are per 100 g.
      CREATE TABLE foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        kcal REAL NOT NULL,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        default_grams REAL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER
      );

      -- What was eaten. Totals are stored (not recomputed from foods) so editing
      -- or deleting a food never rewrites past days. grams is NULL for quick adds.
      CREATE TABLE food_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        meal TEXT NOT NULL,
        food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        grams REAL,
        kcal REAL NOT NULL,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX idx_entries_day ON food_entries(day);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    currentVersion = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
