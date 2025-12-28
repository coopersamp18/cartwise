import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription } from "@/lib/subscription";
import { createPolarClient } from "@/lib/polar";

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

    // Initialize Polar SDK client
    let polar;
    try {
      polar = createPolarClient();
    } catch (error) {
      console.error("Polar configuration error:", error);
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    // Generate pre-authenticated customer portal link using Polar SDK
    try {
      // Create a customer session to get an authenticated portal URL
      const session = await polar.customerSessions.create({
        customerId: subscription.polar_customer_id,
      });

      const portalUrl = session.customerPortalUrl;

      console.log("[customer-portal] Generated authenticated portal URL:", {
        customerId: subscription.polar_customer_id,
        portalUrl,
      });

      return NextResponse.json({
        portalUrl,
      });
    } catch (error: any) {
      console.error("[customer-portal] Error generating portal link:", {
        error: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        { error: error.message || "Failed to generate portal link" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating customer portal link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
