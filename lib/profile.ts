import { createClient } from "@/lib/supabase/client";
import { Profile } from "./types";
import { mapUserToProfile } from "./profile-utils";

/**
 * Get the profile for a user (client-side) from auth metadata
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || user.id !== userId) {
    return null;
  }

  return mapUserToProfile(user);
}

/**
 * Create or update a user profile using auth metadata
 */
export async function upsertProfile(
  userId: string,
  data: Partial<Profile>
): Promise<Profile | null> {
  const supabase = createClient();

  // Get current user to preserve existing metadata
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();
  
  if (getUserError || !user || user.id !== userId) {
    console.error("Error getting user:", getUserError);
    return null;
  }

  // Merge with existing metadata
  const existingMetadata = user.user_metadata || {};
  const updatedMetadata = {
    ...existingMetadata,
    ...(data.full_name !== undefined && { full_name: data.full_name }),
    ...(data.avatar_url !== undefined && { avatar_url: data.avatar_url }),
    ...(data.preferences !== undefined && { preferences: data.preferences }),
  };

  // Update user metadata
  const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
    data: updatedMetadata,
  });

  if (updateError || !updatedUser.user) {
    console.error("Error updating profile:", updateError);
    return null;
  }

  const metadata = updatedUser.user.user_metadata || {};
  
  return {
    id: updatedUser.user.id,
    user_id: updatedUser.user.id,
    full_name: metadata.full_name || null,
    avatar_url: metadata.avatar_url || null,
    preferences: metadata.preferences || null,
    created_at: updatedUser.user.created_at,
    updated_at: updatedUser.user.updated_at || updatedUser.user.created_at,
  };
}

/**
 * Upload avatar to Supabase Storage
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string | null> {
  const supabase = createClient();

  console.log("[uploadAvatar] Starting upload for user:", userId);
  console.log("[uploadAvatar] File details:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[uploadAvatar] Auth error:", authError);
    throw new Error("User not authenticated");
  }
  console.log("[uploadAvatar] User authenticated:", user.id);

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5MB");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = fileName;

  console.log("[uploadAvatar] Uploading to path:", filePath);

  // Try to list buckets to verify it exists (but don't fail if we can't list)
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  console.log("[uploadAvatar] Available buckets:", buckets?.map(b => b.name));
  
  let bucketName = "avatars"; // Default bucket name
  
  if (listError) {
    console.warn("[uploadAvatar] Could not list buckets (may be permission issue):", listError);
    console.log("[uploadAvatar] Will attempt upload to 'avatars' bucket anyway");
  } else {
    // Try to find bucket (case-insensitive)
    const avatarsBucket = buckets?.find(b => b.name.toLowerCase() === "avatars");
    if (avatarsBucket) {
      bucketName = avatarsBucket.name; // Use actual bucket name from list
      console.log("[uploadAvatar] Bucket found in list:", bucketName);
    } else {
      console.warn("[uploadAvatar] 'avatars' bucket not in list, but will try upload anyway");
      const availableNames = buckets?.map(b => b.name).join(", ") || "none";
      console.log("[uploadAvatar] Available buckets:", availableNames);
    }
  }
  
  console.log("[uploadAvatar] Using bucket name:", bucketName);

  // Upload file (use actual bucket name)
  const { error: uploadError, data: uploadData } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Allow overwriting if file exists
    });

  console.log("[uploadAvatar] Upload result:", {
    error: uploadError,
    data: uploadData,
    errorMessage: uploadError?.message,
    errorName: uploadError?.name,
  });

  if (uploadError) {
    console.error("[uploadAvatar] Upload error details:", {
      message: uploadError.message,
      name: uploadError.name,
      statusCode: (uploadError as any).statusCode,
      error: uploadError,
    });
    
    // Provide more specific error messages
    const errorMsg = uploadError.message || "";
    if (errorMsg.includes("Bucket not found") || errorMsg.includes("does not exist") || errorMsg.includes("not found")) {
      throw new Error("Storage bucket 'avatars' not found. Please create it in Supabase Storage settings.");
    }
    if (errorMsg.includes("row-level security") || errorMsg.includes("RLS") || errorMsg.includes("policy") || errorMsg.includes("permission")) {
      throw new Error("Permission denied. Please check your Supabase Storage RLS policies for the 'avatars' bucket. You need policies that allow authenticated users to INSERT files.");
    }
    if (errorMsg.includes("JWT")) {
      throw new Error("Authentication error. Please try logging out and back in.");
    }
    
    // Generic error with full message
    throw new Error(`Failed to upload avatar: ${errorMsg || "Unknown error"}`);
  }

  if (!uploadData) {
    console.error("[uploadAvatar] Upload succeeded but no data returned");
    throw new Error("Upload succeeded but no data returned");
  }

  console.log("[uploadAvatar] Upload successful, path:", uploadData.path);

  // Get public URL (use actual bucket name)
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  console.log("[uploadAvatar] Public URL:", publicUrl);

  // Verify the file exists by trying to list it (use actual bucket name)
  const { data: files, error: verifyError } = await supabase.storage
    .from(bucketName)
    .list("", {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (verifyError) {
    console.warn("[uploadAvatar] Could not verify file in storage:", verifyError);
  } else {
    const uploadedFile = files?.find(f => f.name === fileName);
    if (uploadedFile) {
      console.log("[uploadAvatar] File verified in storage:", uploadedFile);
    } else {
      console.warn("[uploadAvatar] File not found in storage listing, but upload succeeded");
    }
  }

  // Verify URL is valid
  if (!publicUrl || publicUrl.startsWith("data:")) {
    throw new Error("Invalid public URL returned from storage");
  }

  return publicUrl;
}

/**
 * Delete avatar from Supabase Storage
 */
export async function deleteAvatar(avatarUrl: string): Promise<boolean> {
  const supabase = createClient();

  // Extract file path from URL
  // URL format: https://[project].supabase.co/storage/v1/object/public/avatars/filename.jpg
  // Handle case-insensitive bucket name
  const urlMatch = avatarUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/i);
  if (!urlMatch || urlMatch.length < 3) {
    console.error("[deleteAvatar] Could not parse avatar URL:", avatarUrl);
    return false;
  }

  const bucketName = urlMatch[1]; // Extract bucket name from URL
  const fileNameWithParams = urlMatch[2]; // Extract filename (may have query params)
  
  // Extract just the filename (remove any query parameters)
  const fileName = fileNameWithParams.split("?")[0];
  const filePath = fileName;

  console.log("[deleteAvatar] Deleting from bucket:", bucketName, "file:", filePath);

  const { error } = await supabase.storage.from(bucketName).remove([filePath]);

  if (error) {
    console.error("Error deleting avatar:", error);
    return false;
  }

  return true;
}

/**
 * Get avatar URL from profile or user metadata
 */
export function getAvatarUrl(
  profile: Profile | null,
  userEmail?: string | null
): string | null {
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }
  return null;
}

/**
 * Generate user initials from name or email
 */
export function getUserInitials(
  profile: Profile | null,
  userEmail?: string | null
): string {
  // Try to get initials from full name
  if (profile?.full_name) {
    const names = profile.full_name.trim().split(/\s+/);
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    if (names[0].length > 0) {
      return names[0][0].toUpperCase();
    }
  }

  // Fallback to email initials
  if (userEmail) {
    const emailPart = userEmail.split("@")[0];
    if (emailPart.length >= 2) {
      return emailPart.substring(0, 2).toUpperCase();
    }
    return emailPart[0].toUpperCase();
  }

  return "U";
}
