"use client";

import { createClient } from "@/lib/supabase/client";
import { Subscription } from "./types";
import {
  getTrialDaysRemaining,
  hasAccessUntilPeriodEnd,
  isSubscriptionActive,
} from "./subscription-status";

/**
 * Get the subscription for a user (client-side)
 */
export async function getSubscriptionClient(
  userId: string
): Promise<Subscription | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Subscription;
}

/**
 * Check if a subscription is active (including trial period) - client-side
 */
export { isSubscriptionActive, hasAccessUntilPeriodEnd, getTrialDaysRemaining };
