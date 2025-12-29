import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription, upsertSubscription } from "@/lib/subscription";
import { isPolarSandbox } from "@/lib/polar";
import { Subscription } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscription(user.id);
    if (!subscription || !subscription.polar_subscription_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    // Check if subscription is actually canceled
    if (subscription.status !== "canceled") {
      return NextResponse.json(
        { error: "Subscription is not canceled. No action needed." },
        { status: 400 }
      );
    }

    // Reactivate the subscription via Polar API
    try {
      const useSandbox = isPolarSandbox();
      const apiKey = useSandbox
        ? process.env.POLAR_SANDBOX_API_KEY || process.env.POLAR_API_KEY
        : process.env.POLAR_API_KEY;
      
      if (!apiKey) {
        throw new Error("Polar API key not configured");
      }

      const baseUrl = useSandbox
        ? "https://sandbox-api.polar.sh"
        : "https://api.polar.sh";

      // Reactivate subscription by setting cancel_at_period_end to false
      const apiUrl = `${baseUrl}/v1/subscriptions/${subscription.polar_subscription_id}`;
      
      console.log("[reactivate-subscription] Calling Polar API:", {
        url: apiUrl,
        method: "PATCH",
        subscriptionId: subscription.polar_subscription_id,
      });

      const response = await fetch(apiUrl, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancel_at_period_end: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `Polar API error: ${response.statusText}`
        );
      }

      const data = await response.json();

      console.log("[reactivate-subscription] Successfully reactivated subscription:", {
        subscriptionId: subscription.polar_subscription_id,
        userId: user.id,
        response: data,
      });

      // Map Polar status to our database status
      // IMPORTANT: When reactivating, we should NEVER set status to "trial"
      // This is a reactivation of an existing subscription, not a new subscription
      let mappedStatus: Subscription["status"];
      if (data.status === "active") {
        mappedStatus = "active";
      } else if (data.status === "canceled" && !data.cancel_at_period_end) {
        // Subscription was reactivated but Polar might still show "canceled" temporarily
        // If cancel_at_period_end is false, treat it as active
        mappedStatus = "active";
      } else if (data.status === "trialing") {
        // If Polar returns "trialing" for a reactivation, this shouldn't happen
        // But if it does, we'll treat it as active to prevent a new trial
        console.warn("[reactivate-subscription] Polar returned 'trialing' status for reactivation - treating as active");
        mappedStatus = "active";
      } else {
        mappedStatus = subscription.status;
      }

      // Update subscription status in database immediately
      // Polar will send a webhook, but we update immediately for better UX
      // IMPORTANT: Do NOT set trial_ends_at when reactivating - this is not a new trial
      const updatedSubscription = await upsertSubscription(user.id, {
        status: mappedStatus,
        current_period_end: data.current_period_end || subscription.current_period_end,
        // Preserve existing trial_ends_at if it exists, but don't create a new one
        // If reactivating a canceled subscription, trial_ends_at should remain null
        trial_ends_at: subscription.trial_ends_at || null,
      });

      return NextResponse.json({ 
        success: true,
        message: "Subscription reactivated successfully",
        subscription: updatedSubscription,
      });
    } catch (polarError: any) {
      console.error("[reactivate-subscription] Polar API error:", {
        error: polarError.message,
        stack: polarError.stack,
      });

      return NextResponse.json(
        { error: polarError.message || "Failed to reactivate subscription" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[reactivate-subscription] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
