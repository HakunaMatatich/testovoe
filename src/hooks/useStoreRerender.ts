import { useEffect, useState } from 'react';
import { reaction } from 'mobx';
import type { RootStoreInstance } from '../store';

export const useStoreRerender = (store: RootStoreInstance): void => {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const disposer = reaction(
      () => [
        store.meters.length,
        store.addresses.size,
        store.offset,
        store.total,
        store.isLoading,
        store.error,
        store.deletingIds.length,
      ],
      () => {
        forceRender((value) => value + 1);
      }
    );

    return () => {
      disposer();
    };
  }, [store]);
};
