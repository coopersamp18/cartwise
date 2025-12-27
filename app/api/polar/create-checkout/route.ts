import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription, hasActiveSubscription } from "@/lib/subscription";

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

    // Check if user already has an active subscription
    const existingSubscription = await getSubscription(user.id);
    if (existingSubscription) {
      const hasActive = await hasActiveSubscription(user.id);
      if (hasActive) {
        return NextResponse.json(
          { 
            error: "You already have an active subscription",
            hasSubscription: true 
          },
          { status: 400 }
        );
      }
    }

    // Get request body
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

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
    const origin = request.headers.get("origin") || request.headers.get("referer")?.split("/").slice(0, 3).join("/") || "http://localhost:3000";
    const successUrl = `${origin}/auth/subscribe/success`;
    const returnUrl = `${origin}/auth/subscribe`;

    // Prepare checkout payload according to Polar API documentation
    // See: https://polar.sh/docs/api-reference/checkouts/create-session
    // Note: We're NOT including customer_email to prevent Polar from auto-populating
    // with old email addresses. The user will enter their email fresh in the checkout.
    const checkoutPayload: any = {
      products: [productId], // Products should be an array
      success_url: successUrl,
      return_url: returnUrl, // Required by Polar API
      metadata: {
        user_id: user.id,
        user_email: email, // Store email in metadata for webhook processing
      },
    };

    // Only include customer_email if we want to pre-fill (commented out to avoid old email issue)
    // checkoutPayload.customer_email = email;

    console.log("Creating Polar checkout with:", {
      productId,
      email,
      successUrl,
      returnUrl,
      hasApiKey: !!polarApiKey,
    });

    // Create checkout session with Polar API
    // Endpoint: https://api.polar.sh/v1/checkouts/ (not /checkouts/custom)
    const checkoutResponse = await fetch(
      "https://api.polar.sh/v1/checkouts/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${polarApiKey}`,
        },
        body: JSON.stringify(checkoutPayload),
      }
    );

    if (!checkoutResponse.ok) {
      let errorData: any = {};
      const responseText = await checkoutResponse.text();
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        // If response is not JSON, use the text as error message
        errorData = { message: responseText || "Unknown error" };
      }
      
      console.error("Polar API error:", {
        status: checkoutResponse.status,
        statusText: checkoutResponse.statusText,
        errorData,
        productId,
        origin,
      });
      
      // Provide more specific error message
      let errorMessage = "Failed to create checkout session";
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (checkoutResponse.status === 401) {
        errorMessage = "Invalid API credentials. Please contact support.";
      } else if (checkoutResponse.status === 404) {
        errorMessage = "Product not found. Please contact support.";
      } else if (checkoutResponse.status === 400) {
        // Check for "already has subscription" type errors
        const errorLower = (errorData.message || "").toLowerCase();
        if (
          errorLower.includes("already") ||
          errorLower.includes("subscription") ||
          errorLower.includes("existing")
        ) {
          errorMessage = "This email already has a subscription. Please use a different email or contact support.";
        } else {
          errorMessage = errorData.message || "Invalid request. Please check your configuration.";
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: checkoutResponse.status || 500 }
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
