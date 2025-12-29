import { createClient } from "@/lib/supabase/server";
import { Profile } from "./types";
import { mapUserToProfile } from "./profile-utils";

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

  return mapUserToProfile(user);
}
