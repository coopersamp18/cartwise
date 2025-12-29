import { createClient } from "@/lib/supabase/server";
import { Subscription } from "./types";
import {
  getTrialDaysRemaining,
  hasAccessUntilPeriodEnd,
  isSubscriptionActive,
  isTrialActive,
} from "./subscription-status";

export {
  isSubscriptionActive,
  hasAccessUntilPeriodEnd,
  isTrialActive,
  getTrialDaysRemaining,
};

/**
 * Get the subscription for a user
 */
export async function getSubscription(
  userId: string
): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Subscription;
}

/**
 * Check if a user has an active subscription or valid trial
 */
export async function hasActiveSubscription(
  userId: string
): Promise<boolean> {
  const subscription = await getSubscription(userId);

  if (!subscription) {
    return false;
  }

  return isSubscriptionActive(subscription);
}

/**
 * Create or update a subscription record
 */
export async function upsertSubscription(
  userId: string,
  data: Partial<Subscription>
): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting subscription:", error);
    return null;
  }

  return subscription as Subscription;
}
