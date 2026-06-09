import { useEffect, useState } from 'react';
import { fetchUserProfiles, ProfileLite } from '../services/firestore';

/**
 * Resolves a list of user ids to their { displayName, photoURL }.
 * Caches across renders and only fetches ids it hasn't seen yet, so it's safe
 * to pass a changing list (e.g. chat authors) on every render.
 */
export function useProfiles(uids: (string | undefined)[]): Record<string, ProfileLite> {
  const [map, setMap] = useState<Record<string, ProfileLite>>({});

  const clean = Array.from(new Set(uids.filter((u): u is string => !!u)));
  const key = clean.slice().sort().join(',');

  useEffect(() => {
    const missing = clean.filter(uid => !map[uid]);
    if (missing.length === 0) return;
    let alive = true;
    fetchUserProfiles(missing).then(p => {
      if (alive) setMap(prev => ({ ...prev, ...p }));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}
