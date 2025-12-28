import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription } from "@/lib/subscription";
import { createPolarClient, isPolarSandbox } from "@/lib/polar";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription to find Polar customer ID
    const subscription = await getSubscription(user.id);

    if (!subscription || !subscription.polar_customer_id) {
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 404 }
      );
    }

    // Use Polar API directly to fetch customer and subscription details
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

      // Fetch customer information
      const customerResponse = await fetch(
        `${baseUrl}/v1/customers/${subscription.polar_customer_id}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!customerResponse.ok) {
        throw new Error(`Failed to fetch customer: ${customerResponse.statusText}`);
      }

      const customer = await customerResponse.json();

      // Fetch subscription details if available
      let subscriptionDetails = null;
      if (subscription.polar_subscription_id) {
        try {
          const subResponse = await fetch(
            `${baseUrl}/v1/subscriptions/${subscription.polar_subscription_id}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (subResponse.ok) {
            subscriptionDetails = await subResponse.json();
          }
        } catch (subError) {
          console.error("Error fetching subscription details:", subError);
        }
      }

      // Extract billing information
      const billingInfo = {
        email: customer.email || user.email,
        name: customer.name || null,
        customerId: customer.id,
        createdAt: customer.created_at,
        // Additional fields from customer object if available
        metadata: customer.metadata || {},
      };

      return NextResponse.json({
        billingInfo,
        subscriptionDetails: subscriptionDetails ? {
          id: subscriptionDetails.id,
          status: subscriptionDetails.status,
          currentPeriodEnd: subscriptionDetails.current_period_end,
        } : null,
      });
    } catch (error: any) {
      console.error("[billing-info] Error fetching customer info:", {
        error: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        { error: error.message || "Failed to fetch billing information" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching billing information:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
