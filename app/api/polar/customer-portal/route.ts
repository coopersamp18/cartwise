import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription } from "@/lib/subscription";
import { createPolarClient, isPolarSandbox, getPolarOrgSlug } from "@/lib/polar";

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

    // Generate customer portal link using organization slug
    try {
      const baseUrl = isPolarSandbox()
        ? "https://sandbox.polar.sh"
        : "https://polar.sh";
      
      // Get organization slug from environment
      let orgSlug: string;
      try {
        orgSlug = getPolarOrgSlug();
      } catch (error: any) {
        console.error("[customer-portal] Missing organization slug:", error.message);
        return NextResponse.json(
          { 
            error: error.message || "Organization slug not configured. Please set POLAR_ORG_SLUG or POLAR_SANDBOX_ORG_SLUG in your environment variables."
          },
          { status: 500 }
        );
      }
      
      // Polar customer portal URL format: https://{baseUrl}/{orgSlug}/portal
      const portalUrl = `${baseUrl}/${orgSlug}/portal`;

      console.log("[customer-portal] Generated portal URL:", portalUrl);

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
