import { useState, useEffect, useCallback } from 'react';
import { loadProfile, saveProfile } from '../lib/storage';
import type { UserProfile } from '../lib/types';

const DEFAULT_PROFILE: UserProfile = {
  name: '', weight: '', weightUnit: 'kg',
  manual1RM: {}
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile().then(p => { setProfile(p ?? DEFAULT_PROFILE); setLoading(false); });
  }, []);

  // Capture updated value outside the updater so we can await the save.
  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    let updated: UserProfile = DEFAULT_PROFILE;
    setProfile(prev => {
      updated = { ...prev, ...patch };
      return updated;
    });
    await saveProfile(updated);
  }, []);

  // Re-read from storage — call this when the screen regains focus to pick up
  // writes made by other hook instances (e.g. after returning from orm-test).
  const reloadProfile = useCallback(async () => {
    setLoading(true);
    const p = await loadProfile();
    setProfile(p ?? DEFAULT_PROFILE);
    setLoading(false);
  }, []);

  return { profile, loading, updateProfile, reloadProfile };
}
