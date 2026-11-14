import { router } from 'expo-router';

import { ExerciseList } from '@/components/ExerciseList';
import { listExercises } from '@/db/queries';
import { useFocusData } from '@/hooks/useFocusData';

export default function ExercisesScreen() {
  const { data } = useFocusData(listExercises);

  return (
    <ExerciseList
      exercises={data ?? []}
      onSelect={(e) => router.push(`/exercise/${e.id}`)}
      onCreate={(name) => router.push({ pathname: '/exercise/new', params: { name } })}
    />
  );
}
