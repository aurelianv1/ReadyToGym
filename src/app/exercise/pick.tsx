import { router, useLocalSearchParams } from 'expo-router';

import { ExerciseList } from '@/components/ExerciseList';
import { addExerciseToWorkout, listExercises } from '@/db/queries';
import { useFocusData } from '@/hooks/useFocusData';
import { deliverPick } from '@/utils/exercisePicker';

/**
 * Exercise picker.
 * - `workoutId` param: adds the exercise straight to that workout.
 * - `mode=callback`: hands the exercise back to the screen that opened it (routine editor).
 */
export default function PickExerciseScreen() {
  const { workoutId, mode } = useLocalSearchParams<{ workoutId?: string; mode?: string }>();
  const { data, db } = useFocusData(listExercises);

  return (
    <ExerciseList
      exercises={data ?? []}
      onSelect={async (e) => {
        if (mode === 'callback') {
          deliverPick(e);
        } else if (workoutId) {
          await addExerciseToWorkout(db, Number(workoutId), e.id);
        }
        router.back();
      }}
      onCreate={(name) =>
        router.push({
          pathname: '/exercise/new',
          params: { name, ...(workoutId ? { workoutId } : {}), ...(mode ? { mode } : {}) },
        })
      }
    />
  );
}
