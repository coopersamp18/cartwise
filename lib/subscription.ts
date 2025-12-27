import { createClient } from "@/lib/supabase/server";
import { Subscription } from "./types";

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
 * Check if a subscription is active (including trial period)
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  const now = new Date();

  // Check if trial is active
  if (
    subscription.status === "trial" &&
    subscription.trial_ends_at &&
    new Date(subscription.trial_ends_at) > now
  ) {
    return true;
  }

  // Check if subscription is active
  if (
    subscription.status === "active" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end) > now
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a trial is still active
 */
export function isTrialActive(subscription: Subscription): boolean {
  if (subscription.status !== "trial" || !subscription.trial_ends_at) {
    return false;
  }

  return new Date(subscription.trial_ends_at) > new Date();
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription: Subscription): number {
  if (!subscription.trial_ends_at) {
    return 0;
  }

  const now = new Date();
  const trialEnd = new Date(subscription.trial_ends_at);
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
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
