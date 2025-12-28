import { createClient } from "@/lib/supabase/server";
import { Profile } from "./types";

/**
 * Get the profile for a user (server-side) from auth metadata
 */
export async function getProfileServer(
  userId: string
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || user.id !== userId) {
    return null;
  }

  // Extract profile data from user metadata
  const metadata = user.user_metadata || {};
  
  return {
    id: user.id,
    user_id: user.id,
    full_name: metadata.full_name || null,
    avatar_url: metadata.avatar_url || null,
    preferences: metadata.preferences || null,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  };
}
