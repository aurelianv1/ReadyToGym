import type { SQLiteDatabase } from 'expo-sqlite';

export type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  is_custom: number;
};

export type Workout = {
  id: number;
  name: string;
  started_at: number;
  finished_at: number | null;
  routine_id: number | null;
};

export type WorkoutSummary = Workout & {
  exercise_count: number;
  set_count: number;
  volume: number;
};

export type SetRow = {
  id: number;
  position: number;
  weight: number | null;
  reps: number | null;
  done: number;
};

export type WorkoutExercise = {
  id: number;
  exercise_id: number;
  name: string;
  muscle_group: string;
  position: number;
  sets: SetRow[];
};

export type ExerciseSession = {
  workout_id: number;
  started_at: number;
  sets: SetRow[];
};

export const MUSCLE_GROUPS = ['Piept', 'Spate', 'Picioare', 'Umeri', 'Brațe', 'Abdomen', 'Altele'];

const DEFAULT_SET_COUNT = 3;

function defaultWorkoutName(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Antrenament de dimineață';
  if (h < 18) return 'Antrenament de după-amiază';
  return 'Antrenament de seară';
}

export function getActiveWorkout(db: SQLiteDatabase) {
  return db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1',
  );
}

export async function startWorkout(db: SQLiteDatabase) {
  const active = await getActiveWorkout(db);
  if (active) return active.id;
  const res = await db.runAsync(
    'INSERT INTO workouts (name, started_at) VALUES (?, ?)',
    defaultWorkoutName(),
    Date.now(),
  );
  return res.lastInsertRowId;
}

export function getWorkout(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Workout>('SELECT * FROM workouts WHERE id = ?', id);
}

export async function renameWorkout(db: SQLiteDatabase, id: number, name: string) {
  await db.runAsync('UPDATE workouts SET name = ? WHERE id = ?', name.trim() || 'Antrenament', id);
}

export async function getWorkoutExercises(db: SQLiteDatabase, workoutId: number) {
  const exercises = await db.getAllAsync<Omit<WorkoutExercise, 'sets'>>(
    `SELECT we.id, we.exercise_id, we.position, e.name, e.muscle_group
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = ?
      ORDER BY we.position`,
    workoutId,
  );
  const sets = await db.getAllAsync<SetRow & { workout_exercise_id: number }>(
    `SELECT s.* FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
      WHERE we.workout_id = ?
      ORDER BY s.position`,
    workoutId,
  );
  return exercises.map((e) => ({
    ...e,
    sets: sets.filter((s) => s.workout_exercise_id === e.id),
  }));
}

export async function finishWorkout(db: SQLiteDatabase, workoutId: number) {
  let kept = 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM sets
        WHERE reps IS NULL
          AND workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?)`,
      workoutId,
    );
    await db.runAsync(
      `UPDATE sets SET done = 1
        WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?)`,
      workoutId,
    );
    await db.runAsync(
      `DELETE FROM workout_exercises
        WHERE workout_id = ?
          AND id NOT IN (SELECT workout_exercise_id FROM sets)`,
      workoutId,
    );
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM sets s
         JOIN workout_exercises we ON we.id = s.workout_exercise_id
        WHERE we.workout_id = ?`,
      workoutId,
    );
    kept = row?.n ?? 0;
    if (kept === 0) {
      await db.runAsync('DELETE FROM workouts WHERE id = ?', workoutId);
    } else {
      await db.runAsync('UPDATE workouts SET finished_at = ? WHERE id = ?', Date.now(), workoutId);
    }
  });
  return kept;
}

export async function deleteWorkout(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
}

export function listWorkouts(db: SQLiteDatabase) {
  return db.getAllAsync<WorkoutSummary>(
    `SELECT w.*,
            (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) AS exercise_count,
            COUNT(s.id) AS set_count,
            COALESCE(SUM(COALESCE(s.weight, 0) * COALESCE(s.reps, 0)), 0) AS volume
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
      WHERE w.finished_at IS NOT NULL
      GROUP BY w.id
      ORDER BY w.started_at DESC`,
  );
}

export async function getHomeStats(db: SQLiteDatabase) {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const week = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM workouts WHERE finished_at IS NOT NULL AND started_at >= ?',
    monday.getTime(),
  );
  const total = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM workouts WHERE finished_at IS NOT NULL',
  );
  return { thisWeek: week?.n ?? 0, total: total?.n ?? 0 };
}

export async function getPreviousSets(
  db: SQLiteDatabase,
  exerciseId: number,
  excludeWorkoutId?: number,
) {
  const last = await db.getFirstAsync<{ id: number }>(
    `SELECT we.id FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
      WHERE we.exercise_id = ? AND w.finished_at IS NOT NULL AND w.id != ?
      ORDER BY w.started_at DESC, we.position DESC
      LIMIT 1`,
    exerciseId,
    excludeWorkoutId ?? -1,
  );
  if (!last) return [];
  return db.getAllAsync<SetRow>(
    'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY position',
    last.id,
  );
}

export async function addExerciseToWorkout(
  db: SQLiteDatabase,
  workoutId: number,
  exerciseId: number,
) {
  const previous = await getPreviousSets(db, exerciseId, workoutId);
  const setCount = previous.length || DEFAULT_SET_COUNT;
  await db.withTransactionAsync(() => insertWorkoutExercise(db, workoutId, exerciseId, setCount));
}

async function insertWorkoutExercise(
  db: SQLiteDatabase,
  workoutId: number,
  exerciseId: number,
  setCount: number,
) {
  const pos = await db.getFirstAsync<{ p: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS p FROM workout_exercises WHERE workout_id = ?',
    workoutId,
  );
  const res = await db.runAsync(
    'INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?)',
    workoutId,
    exerciseId,
    pos?.p ?? 0,
  );
  for (let i = 0; i < setCount; i++) {
    await db.runAsync(
      'INSERT INTO sets (workout_exercise_id, position) VALUES (?, ?)',
      res.lastInsertRowId,
      i,
    );
  }
}

export async function removeWorkoutExercise(db: SQLiteDatabase, workoutExerciseId: number) {
  await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', workoutExerciseId);
}

export async function addSet(db: SQLiteDatabase, workoutExerciseId: number) {
  await db.runAsync(
    `INSERT INTO sets (workout_exercise_id, position)
     VALUES (?, (SELECT COALESCE(MAX(position), -1) + 1 FROM sets WHERE workout_exercise_id = ?))`,
    workoutExerciseId,
    workoutExerciseId,
  );
}

export async function updateSet(
  db: SQLiteDatabase,
  setId: number,
  values: { weight: number | null; reps: number | null; done: boolean },
) {
  await db.runAsync(
    'UPDATE sets SET weight = ?, reps = ?, done = ? WHERE id = ?',
    values.weight,
    values.reps,
    values.done ? 1 : 0,
    setId,
  );
}

export async function deleteSet(db: SQLiteDatabase, setId: number) {
  await db.runAsync('DELETE FROM sets WHERE id = ?', setId);
}

export function listExercises(db: SQLiteDatabase) {
  return db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name COLLATE NOCASE');
}

export function getExercise(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Exercise>('SELECT * FROM exercises WHERE id = ?', id);
}

export function normalizeName(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export async function createExercise(db: SQLiteDatabase, name: string, muscleGroup: string) {
  const all = await db.getAllAsync<{ name: string }>('SELECT name FROM exercises');
  const key = normalizeName(name);
  if (all.some((e) => normalizeName(e.name) === key)) return null;
  const res = await db.runAsync(
    'INSERT INTO exercises (name, muscle_group, is_custom) VALUES (?, ?, 1)',
    name.trim(),
    muscleGroup,
  );
  return res.lastInsertRowId;
}

export async function deleteExercise(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM exercises WHERE id = ?', id);
}

export async function getExerciseHistory(db: SQLiteDatabase, exerciseId: number) {
  const rows = await db.getAllAsync<SetRow & { workout_id: number; started_at: number }>(
    `SELECT s.*, w.id AS workout_id, w.started_at
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
      WHERE we.exercise_id = ? AND w.finished_at IS NOT NULL
      ORDER BY w.started_at DESC, we.position, s.position`,
    exerciseId,
  );
  const sessions: ExerciseSession[] = [];
  for (const r of rows) {
    let session = sessions[sessions.length - 1];
    if (!session || session.workout_id !== r.workout_id) {
      session = { workout_id: r.workout_id, started_at: r.started_at, sets: [] };
      sessions.push(session);
    }
    session.sets.push(r);
  }
  return sessions;
}

export type Routine = {
  id: number;
  name: string;
  created_at: number;
};

export type RoutineItem = {
  exercise_id: number;
  name: string;
  muscle_group: string;
  set_count: number;
};

export type RoutineSummary = Routine & {
  items: RoutineItem[];
  last_done: number | null;
};

async function getRoutineItems(db: SQLiteDatabase, routineId?: number) {
  return db.getAllAsync<RoutineItem & { routine_id: number }>(
    `SELECT re.routine_id, re.exercise_id, re.set_count, e.name, e.muscle_group
       FROM routine_exercises re
       JOIN exercises e ON e.id = re.exercise_id
      WHERE ? IS NULL OR re.routine_id = ?
      ORDER BY re.routine_id, re.position`,
    routineId ?? null,
    routineId ?? null,
  );
}

export async function listRoutines(db: SQLiteDatabase): Promise<RoutineSummary[]> {
  const routines = await db.getAllAsync<Routine & { last_done: number | null }>(
    `SELECT r.*,
            (SELECT MAX(w.started_at) FROM workouts w
              WHERE w.routine_id = r.id AND w.finished_at IS NOT NULL) AS last_done
       FROM routines r
      ORDER BY r.created_at`,
  );
  const items = await getRoutineItems(db);
  return routines.map((r) => ({ ...r, items: items.filter((i) => i.routine_id === r.id) }));
}

export async function getRoutine(db: SQLiteDatabase, id: number) {
  const routine = await db.getFirstAsync<Routine>('SELECT * FROM routines WHERE id = ?', id);
  if (!routine) return null;
  return { ...routine, items: await getRoutineItems(db, id) };
}

export async function saveRoutine(
  db: SQLiteDatabase,
  routine: { id?: number; name: string; items: { exercise_id: number; set_count: number }[] },
) {
  let id = routine.id;
  const name = routine.name.trim() || 'Rutină';
  await db.withTransactionAsync(async () => {
    if (id) {
      await db.runAsync('UPDATE routines SET name = ? WHERE id = ?', name, id);
      await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', id);
    } else {
      const res = await db.runAsync(
        'INSERT INTO routines (name, created_at) VALUES (?, ?)',
        name,
        Date.now(),
      );
      id = res.lastInsertRowId;
    }
    for (const [i, item] of routine.items.entries()) {
      await db.runAsync(
        'INSERT INTO routine_exercises (routine_id, exercise_id, position, set_count) VALUES (?, ?, ?, ?)',
        id!,
        item.exercise_id,
        i,
        Math.max(1, Math.round(item.set_count)),
      );
    }
  });
  return id!;
}

export async function deleteRoutine(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM routines WHERE id = ?', id);
}

export async function startWorkoutFromRoutine(db: SQLiteDatabase, routineId: number) {
  if (await getActiveWorkout(db)) return null;
  const routine = await getRoutine(db, routineId);
  if (!routine) return null;

  let workoutId = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      'INSERT INTO workouts (name, started_at, routine_id) VALUES (?, ?, ?)',
      routine.name,
      Date.now(),
      routineId,
    );
    workoutId = res.lastInsertRowId;
    for (const item of routine.items) {
      await insertWorkoutExercise(db, workoutId, item.exercise_id, item.set_count);
    }
  });
  return workoutId;
}

export async function createRoutineFromWorkout(db: SQLiteDatabase, workoutId: number, name: string) {
  const exercises = await getWorkoutExercises(db, workoutId);
  return saveRoutine(db, {
    name,
    items: exercises.map((e) => ({
      exercise_id: e.exercise_id,
      set_count: e.sets.length || DEFAULT_SET_COUNT,
    })),
  });
}
