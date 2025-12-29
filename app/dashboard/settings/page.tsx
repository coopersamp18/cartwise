"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent, CardHeader, Input } from "@/components/ui";
import { Profile } from "@/lib/types";
import {
  getProfile,
  upsertProfile,
  uploadAvatar,
  deleteAvatar,
  getUserInitials,
} from "@/lib/profile";
import { ChefHat, Upload, X, Save } from "lucide-react";
import { ProfileDropdown } from "@/components/ProfileDropdown";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/auth/login");
          return;
        }

        setUser(authUser);
        const userProfile = await getProfile(authUser.id);
        setProfile(userProfile);
        setFullName(userProfile?.full_name || "");
        setAvatarPreview(userProfile?.avatar_url || null);
      } catch (error) {
        console.error("Error loading user data:", error);
        setError("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [supabase, router]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[handleAvatarSelect] File selected:", file?.name);
    if (!file) return;

    // Validate file type - only JPG and PNG allowed
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG or PNG image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setAvatarFile(file);
    setError("");
    console.log("[handleAvatarSelect] File validated and set:", file.name);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
      console.log("[handleAvatarSelect] Preview created");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (profile?.avatar_url) {
      await deleteAvatar(profile.avatar_url);
    }
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    console.log("[handleSave] Save button clicked");
    if (!user) {
      console.error("[handleSave] No user found");
      return;
    }

    console.log("[handleSave] User:", user.id);
    console.log("[handleSave] Avatar file:", avatarFile?.name);
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      // Update password if provided
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          setError("Please fill in all password fields");
          setIsSaving(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          setError("New passwords do not match");
          setIsSaving(false);
          return;
        }

        if (newPassword.length < 6) {
          setError("Password must be at least 6 characters");
          setIsSaving(false);
          return;
        }

        // Update password
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          setError(passwordError.message || "Failed to update password");
          setIsSaving(false);
          return;
        }
      }

      // Upload avatar if new file selected
      let avatarUrl = profile?.avatar_url || null;
      if (avatarFile) {
        console.log("[handleSave] Starting avatar upload, file:", avatarFile.name);
        try {
          const uploadedUrl = await uploadAvatar(user.id, avatarFile);
          console.log("[handleSave] Upload completed, URL:", uploadedUrl);
          
          // Validate that we got a Supabase URL (not a data URL)
          if (!uploadedUrl) {
            console.error("[handleSave] Upload returned null URL");
            setError("Failed to upload avatar. Please try again.");
            setIsSaving(false);
            return;
          }
          
          if (uploadedUrl.startsWith("data:")) {
            console.error("[handleSave] Upload returned data URL instead of Supabase URL");
            setError("Upload failed. Please check your Supabase Storage bucket configuration.");
            setIsSaving(false);
            return;
          }
          
          // Verify it's a Supabase URL
          if (!uploadedUrl.includes("supabase.co") && !uploadedUrl.includes("supabase")) {
            console.warn("[handleSave] Upload URL doesn't look like a Supabase URL:", uploadedUrl);
          }
          
          console.log("[handleSave] Valid Supabase URL received:", uploadedUrl);
          avatarUrl = uploadedUrl;
        } catch (uploadError) {
          console.error("[handleSave] Upload error:", uploadError);
          setError(uploadError instanceof Error ? uploadError.message : "Failed to upload avatar");
          setIsSaving(false);
          return;
        }
      } else if (!avatarPreview && profile?.avatar_url) {
        // Avatar was removed
        avatarUrl = null;
      }

      // Update profile
      const updatedProfile = await upsertProfile(user.id, {
        full_name: fullName || null,
        avatar_url: avatarUrl,
      });

      if (updatedProfile) {
        setProfile(updatedProfile);
        // Only set avatar preview to Supabase URL (not data URLs)
        const savedUrl = updatedProfile.avatar_url;
        if (savedUrl && !savedUrl.startsWith("data:")) {
          setAvatarPreview(savedUrl);
          console.log("[handleSave] Profile saved with avatar URL:", savedUrl);
        } else {
          // Clear preview if no valid URL
          setAvatarPreview(null);
        }
        setSuccess("Profile updated successfully");
        setAvatarFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Clear password fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        
        // Refresh user data to get updated metadata
        const refreshedProfile = await getProfile(user.id);
        if (refreshedProfile) {
          setProfile(refreshedProfile);
          const refreshedUrl = refreshedProfile.avatar_url;
          if (refreshedUrl && !refreshedUrl.startsWith("data:")) {
            setAvatarPreview(refreshedUrl);
            console.log("[handleSave] Refreshed profile with avatar URL:", refreshedUrl);
          }
        }
      } else {
        setError("Failed to update profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const initials = getUserInitials(profile, user?.email);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <span className="font-serif text-xl font-bold">Cartwise</span>
          </Link>
          <ProfileDropdown />
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="py-4">
              <p className="text-sm text-green-600">{success}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <h2 className="font-serif text-xl font-bold">Profile Picture</h2>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                    {(avatarPreview && !avatarPreview.startsWith("data:") && avatarPreview) || profile?.avatar_url ? (
                      <img
                        src={(avatarPreview && !avatarPreview.startsWith("data:") ? avatarPreview : null) || profile?.avatar_url || ""}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("Failed to load avatar image:", e);
                          // Fallback to initials if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : avatarPreview && avatarPreview.startsWith("data:") ? (
                      // Show local preview only if it's a data URL (temporary preview)
                      <img
                        src={avatarPreview}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-primary">
                        {initials}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleAvatarSelect}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    {avatarPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG or PNG. Max size 5MB.
                  </p>
                  {avatarFile && !isSaving && (
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠️ File selected. Click "Save Changes" below to upload to Supabase.
                    </p>
                  )}
                  {isSaving && avatarFile && (
                    <p className="text-xs text-blue-600 font-medium">
                      ⏳ Uploading to Supabase Storage...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information Section */}
          <Card>
            <CardHeader>
              <h2 className="font-serif text-xl font-bold">Profile Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <h2 className="font-serif text-xl font-bold">Change Password</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep your current password
              </p>
            </CardContent>
          </Card>

          {/* Preferences Section (Placeholder for future) */}
          <Card>
            <CardHeader>
              <h2 className="font-serif text-xl font-bold">Preferences</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                More preferences coming soon...
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
