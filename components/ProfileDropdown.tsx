"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/Dropdown";
import { Profile } from "@/lib/types";
import { getProfile, getAvatarUrl, getUserInitials } from "@/lib/profile";
import { Settings, CreditCard, LogOut, User } from "lucide-react";

export function ProfileDropdown() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
          const userProfile = await getProfile(authUser.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [supabase]);

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    }
  };

  const handleSubscriptionManagement = () => {
    router.push("/dashboard/subscription");
  };

  if (isLoading || !user) {
    return (
      <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
    );
  }

  const avatarUrl = getAvatarUrl(profile, user.email);
  const initials = getUserInitials(profile, user.email);

  return (
    <Dropdown
      trigger={
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border hover:border-primary transition-colors">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-primary">
              {initials}
            </span>
          )}
        </div>
      }
      align="right"
    >
      <div className="py-2">
        {/* User info header */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">
            {profile?.full_name || "User"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {user.email}
          </p>
        </div>

        {/* Menu items */}
        <DropdownItem
          onClick={() => router.push("/dashboard/settings")}
          className="flex items-center gap-3"
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </DropdownItem>

        <DropdownItem
          onClick={handleSubscriptionManagement}
          className="flex items-center gap-3"
        >
          <CreditCard className="w-4 h-4" />
          <span>Subscription</span>
        </DropdownItem>

        <DropdownSeparator />

        <DropdownItem
          onClick={handleSignOut}
          className="flex items-center gap-3 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </DropdownItem>
      </div>
    </Dropdown>
  );
}
