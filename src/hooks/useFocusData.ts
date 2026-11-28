import { useFocusEffect } from 'expo-router';
import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

export function useFocusData<T>(loader: (db: SQLiteDatabase) => Promise<T>, deps: unknown[] = []) {
  const db = useSQLiteContext();
  const [data, setData] = useState<T | undefined>(undefined);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => setData(await loader(db)), [db, ...deps]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, reload, db };
}
