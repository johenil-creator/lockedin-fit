import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { loadProfile, saveProfile } from '../lib/storage';
import { setHapticsEnabled } from '../lib/haptics';
import type { UserProfile } from '../lib/types';

const DEFAULT_PROFILE: UserProfile = {
  name: '', weight: '', weightUnit: 'kg',
  manual1RM: {}
};

type ProfileContextValue = {
  profile: UserProfile;
  loading: boolean;
  hydrated: boolean;
  // Always holds the latest profile value synchronously — safe to read before
  // React has committed the pending setProfile state update.
  profileRef: { current: UserProfile };
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  // Ref mirrors profile state but updates synchronously — avoids stale reads
  // in gate effects that run before React commits the batched setProfile update.
  const profileRef = useRef<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    loadProfile().then(p => {
      const value = p ?? DEFAULT_PROFILE;
      profileRef.current = value;
      setProfile(value);
      setHapticsEnabled(value.hapticsEnabled !== false);
      setLoading(false);
      setHydrated(true);
    }).catch(() => { setLoading(false); setHydrated(true); });
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const updated = { ...profileRef.current, ...patch };
    profileRef.current = updated;   // sync — always up-to-date
    setProfile(updated);            // schedule React re-render
    if ('hapticsEnabled' in patch) setHapticsEnabled(updated.hapticsEnabled !== false);
    await saveProfile(updated);     // persist
  }, []);

  const reloadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const p = await loadProfile();
      const value = p ?? DEFAULT_PROFILE;
      profileRef.current = value;
      setProfile(value);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ profile, loading, hydrated, profileRef, updateProfile, reloadProfile }),
    [profile, loading, hydrated, updateProfile, reloadProfile]
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider');
  return ctx;
}
