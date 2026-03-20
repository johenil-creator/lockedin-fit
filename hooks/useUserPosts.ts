import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { createPost as createPostService } from "../lib/userPostService";

type UseUserPostsResult = {
  createPost: (text: string) => Promise<void>;
  posting: boolean;
};

export function useUserPosts(): UseUserPostsResult {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const [posting, setPosting] = useState(false);

  const createPost = useCallback(
    async (text: string) => {
      if (!user) return;
      setPosting(true);
      try {
        await createPostService(
          user.uid,
          profile.name || user.displayName || user.email?.split("@")[0] || "Wolf",
          text
        );
      } finally {
        setPosting(false);
      }
    },
    [user, profile.name]
  );

  return { createPost, posting };
}
