import type { User } from "@supabase/supabase-js";
import { Profile } from "./types";

export function mapUserToProfile(user: User): Profile {
  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    user_id: user.id,
    full_name: metadata.full_name ?? null,
    avatar_url: metadata.avatar_url ?? null,
    preferences: metadata.preferences ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  };
}
