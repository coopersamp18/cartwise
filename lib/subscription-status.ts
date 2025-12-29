import { Subscription } from "./types";

/**
 * Determine if a subscription is active (includes trials).
 * Payment failure or terminated statuses are considered inactive.
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  const now = new Date();

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

  if (
    subscription.status === "trial" &&
    subscription.trial_ends_at &&
    new Date(subscription.trial_ends_at) > now
  ) {
    return true;
  }

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
 * Whether the user should retain access until the current period end,
 * allowing canceled plans to run out but blocking payment failures.
 */
export function hasAccessUntilPeriodEnd(subscription: Subscription): boolean {
  const now = new Date();

  if (
    subscription.status === "past_due" ||
    subscription.status === "unpaid" ||
    subscription.status === "revoked" ||
    subscription.status === "expired" ||
    subscription.status === "inactive"
  ) {
    return false;
  }

  if (subscription.status === "canceled") {
    if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > now) {
      return true;
    }
    if (subscription.current_period_end && new Date(subscription.current_period_end) > now) {
      return true;
    }
    return false;
  }

  return isSubscriptionActive(subscription);
}

export function isTrialActive(subscription: Subscription): boolean {
  if (subscription.status !== "trial" || !subscription.trial_ends_at) {
    return false;
  }
  return new Date(subscription.trial_ends_at) > new Date();
}

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
