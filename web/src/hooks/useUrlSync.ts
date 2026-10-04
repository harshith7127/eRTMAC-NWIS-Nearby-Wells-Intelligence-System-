/**
 * URL Synchronization Hook for Single Selection Store (Rule R6)
 */

import { useEffect } from 'react';
import { useSelectionStore, getInitialStateFromURL } from '../store/useSelectionStore';

export function useUrlSync() {
  useEffect(() => {
    const handlePopState = () => {
      const updated = getInitialStateFromURL();
      useSelectionStore.setState((prev) => ({
        ...prev,
        ...updated
      }));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
