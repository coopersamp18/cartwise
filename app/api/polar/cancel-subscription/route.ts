import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription } from "@/lib/subscription";
import { createPolarClient } from "@/lib/polar";

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

    // Check if already canceled
    if (subscription.status === "canceled") {
      return NextResponse.json(
        { error: "Subscription is already canceled" },
        { status: 400 }
      );
    }

    // Cancel the subscription via Polar API
    // The subscription will remain active until the end of the billing period
    try {
      const useSandbox = process.env.POLAR_USE_SANDBOX === "true";
      const apiKey = useSandbox
        ? process.env.POLAR_SANDBOX_API_KEY || process.env.POLAR_API_KEY
        : process.env.POLAR_API_KEY;
      
      if (!apiKey) {
        throw new Error("Polar API key not configured");
      }

      // Polar API base URL - using the same pattern as the SDK
      // SDK uses: sandbox-api.polar.sh for sandbox, api.polar.sh for production
      const baseUrl = useSandbox
        ? "https://sandbox-api.polar.sh"
        : "https://api.polar.sh";

      // Use Polar API directly to cancel subscription
      // PATCH /v1/subscriptions/{id} with cancel_at_period_end: true
      const apiUrl = `${baseUrl}/v1/subscriptions/${subscription.polar_subscription_id}`;
      
      console.log("[cancel-subscription] Calling Polar API:", {
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
          cancel_at_period_end: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `Polar API error: ${response.statusText}`
        );
      }

      const data = await response.json();

      console.log("[cancel-subscription] Successfully canceled subscription:", {
        subscriptionId: subscription.polar_subscription_id,
        userId: user.id,
        response: data,
      });

      return NextResponse.json({ 
        success: true,
        message: "Subscription canceled successfully. You'll have access until the end of your billing period."
      });
    } catch (polarError: any) {
      console.error("[cancel-subscription] Polar API error:", {
        error: polarError.message,
        stack: polarError.stack,
      });

      return NextResponse.json(
        { error: polarError.message || "Failed to cancel subscription" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[cancel-subscription] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
