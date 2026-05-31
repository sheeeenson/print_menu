import { useEffect, useState } from 'react';

export function useProjectStore(store) {
  const [snapshot, setSnapshot] = useState(() => store.getSnapshot());

  useEffect(() => store.subscribe(setSnapshot), [store]);

  return snapshot;
}
