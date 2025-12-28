"use client";

import { createClient } from "@/lib/supabase/client";
import { Subscription } from "./types";

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
export function isSubscriptionActive(subscription: Subscription): boolean {
  const now = new Date();

  // Payment failure statuses are not active
  if (
    subscription.status === "past_due" ||
    subscription.status === "unpaid" ||
    subscription.status === "revoked" ||
    subscription.status === "canceled" ||
    subscription.status === "expired" ||
    subscription.status === "inactive"
  ) {
    return false;
  }

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
 * Check if a user has access to the platform (including canceled subscriptions until period ends) - client-side
 * This allows canceled subscriptions to maintain access until their trial or billing period ends
 */
export function hasAccessUntilPeriodEnd(subscription: Subscription): boolean {
  const now = new Date();

  // Payment failure statuses that should immediately block access
  if (
    subscription.status === "past_due" ||
    subscription.status === "unpaid" ||
    subscription.status === "revoked" ||
    subscription.status === "expired" ||
    subscription.status === "inactive"
  ) {
    return false;
  }

  // For canceled subscriptions, check if period hasn't ended yet
  if (subscription.status === "canceled") {
    // Check if trial period is still active
    if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > now) {
      return true;
    }
    // Check if billing period is still active
    if (subscription.current_period_end && new Date(subscription.current_period_end) > now) {
      return true;
    }
    // Period has ended
    return false;
  }

  // For active subscriptions and trials, use the standard active check
  return isSubscriptionActive(subscription);
}

/**
 * Get days remaining in trial - client-side
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
