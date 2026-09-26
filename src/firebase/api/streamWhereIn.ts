import {
  DocumentData,
  FieldPath,
  onSnapshot,
  query,
  Query,
  QueryDocumentSnapshot,
  Unsubscribe,
  where,
} from 'firebase/firestore';

// Firestore accepts at most 30 values in an `in` filter.
const IN_FILTER_LIMIT = 30;

/**
 * Streams the documents of `base` whose `field` is one of `values`, splitting the
 * values across as many listeners as the `in` limit requires. `onNext` receives
 * the merged documents once every listener has delivered its first snapshot, and
 * again on every later change.
 */
export const streamWhereIn = (
  base: Query<DocumentData>,
  field: string | FieldPath,
  values: string[],
  onNext: (docs: QueryDocumentSnapshot<DocumentData>[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const uniqueValues = [...new Set(values)];
  if (!uniqueValues.length) {
    onNext([]);
    return () => {};
  }

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueValues.length; i += IN_FILTER_LIMIT) {
    chunks.push(uniqueValues.slice(i, i + IN_FILTER_LIMIT));
  }

  const results: (QueryDocumentSnapshot<DocumentData>[] | null)[] = chunks.map(() => null);
  const unsubscribes = chunks.map((chunk, index) =>
    onSnapshot(
      query(base, where(field, 'in', chunk)),
      (snapshot) => {
        results[index] = snapshot.docs;
        if (results.every((docs) => docs !== null)) {
          onNext(results.flatMap((docs) => docs ?? []));
        }
      },
      onError
    )
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
};
