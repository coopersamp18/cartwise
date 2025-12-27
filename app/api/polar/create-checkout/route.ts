import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

    // Get request body
    const body = await request.json();
    const { email } = body;

    // Validate environment variables
    const polarApiKey = process.env.POLAR_API_KEY;
    const productId = process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID;

    if (!polarApiKey || !productId) {
      console.error("Missing Polar configuration");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    // Get the origin for success/cancel URLs
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Create checkout session with Polar API
    const checkoutResponse = await fetch(
      "https://api.polar.sh/v1/checkouts/custom",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${polarApiKey}`,
        },
        body: JSON.stringify({
          product_id: productId,
          customer_email: email,
          success_url: `${origin}/auth/subscribe/success`,
          metadata: {
            user_id: user.id,
          },
        }),
      }
    );

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      console.error("Polar API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    const checkoutData = await checkoutResponse.json();

    return NextResponse.json({
      checkoutUrl: checkoutData.url,
      checkoutId: checkoutData.id,
    });
  } catch (error) {
    console.error("Error creating checkout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
