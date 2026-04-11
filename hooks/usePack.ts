import { useState, useEffect, useCallback } from "react";
import {
  createPack as createPackService,
  joinPack as joinPackService,
  leavePack as leavePackService,
  getPackDetail,
  getCachedPack,
} from "../lib/packService";
import { savePackInfo, loadXP, loadLockeCustomization } from "../lib/storage";
import { queueSocialWrite } from "../lib/socialSync";
import { useAuth } from "../contexts/AuthContext";
import { useProfileContext } from "../contexts/ProfileContext";
import type { PackInfo, PackMember } from "../lib/types";

type UsePackResult = {
  pack: PackInfo | null;
  members: PackMember[];
  loading: boolean;
  create: (name: string, motto?: string) => Promise<boolean>;
  join: (code: string) => Promise<boolean>;
  leave: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

export function usePack(): UsePackResult {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const [pack, setPack] = useState<PackInfo | null>(null);
  const [members, setMembers] = useState<PackMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const cached = await getCachedPack();
    if (cached) {
      setPack(cached);

      // Then fetch fresh data from Firestore
      if (user) {
        const detail = await getPackDetail(cached.id);
        if (detail) {
          const myMember = detail.members.find((m) => m.userId === user.uid);
          const updatedPack = { ...detail.pack, role: myMember?.role ?? "member" as const };
          setPack(updatedPack);
          setMembers(detail.members);
          await savePackInfo(updatedPack);
        }
      }
    } else {
      setPack(null);
      setMembers([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (name: string, motto?: string): Promise<boolean> => {
    if (!user) return false;
    const displayName = profile.name || user.displayName || user.email?.split("@")[0] || "Wolf";
    const result = await createPackService(user.uid, displayName, name, motto);
    if (result) {
      // Read actual rank + customization so the member row matches the profile
      const [xp, customization] = await Promise.all([loadXP(), loadLockeCustomization()]);
      const rank = xp?.rank ?? "Runt";
      setPack(result);
      setMembers([{
        userId: user.uid,
        displayName,
        rank,
        role: "leader",
        weeklyXp: 0,
        lockeCustomization: customization,
      }]);
      // Ensure Firestore user doc has current rank + customization
      // so getPackDetail() returns correct data on future loads
      queueSocialWrite("users", user.uid, {
        rank,
        lockeCustomization: customization,
      }).catch(() => {});
      // Also fetch fresh data from Firestore in the background
      refresh();
      return true;
    }
    return false;
  }, [user, profile.name, refresh]);

  const join = useCallback(async (code: string): Promise<boolean> => {
    if (!user) return false;
    const displayName = profile.name || user.displayName || user.email?.split("@")[0] || "Wolf";
    const result = await joinPackService(user.uid, displayName, code);
    if (result) {
      setPack(result);
      await refresh();
      return true;
    }
    return false;
  }, [user, profile.name, refresh]);

  const leave = useCallback(async (): Promise<boolean> => {
    if (!user || !pack) return false;
    const success = await leavePackService(user.uid, pack.id);
    if (success) {
      setPack(null);
      setMembers([]);
    }
    return success;
  }, [user, pack]);

  return { pack, members, loading, create, join, leave, refresh };
}
