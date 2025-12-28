import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription, hasActiveSubscription } from "@/lib/subscription";
import {
  createPolarClient,
  getPolarProductId,
  isPolarSandbox,
} from "@/lib/polar";

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
            hasSubscription: true,
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

    // Initialize Polar SDK client
    let polar;
    let productId;
    try {
      polar = createPolarClient();
      productId = getPolarProductId();
    } catch (error) {
      console.error("Polar configuration error:", error);
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    // Get the origin for success/cancel URLs
    const origin =
      request.headers.get("origin") ||
      request.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "http://localhost:3000";
    const successUrl = `${origin}/auth/subscribe/success`;
    const returnUrl = `${origin}/auth/subscribe`;

    console.log("Creating Polar checkout with:", {
      environment: isPolarSandbox() ? "sandbox" : "production",
      productId,
      email,
      successUrl,
      returnUrl,
    });

    // Create checkout session using Polar SDK
    try {
      const checkout = await polar.checkouts.create({
        products: [productId],
        successUrl: successUrl,
        // Note: We're NOT including customerEmail to prevent Polar from auto-populating
        // with old email addresses. The user will enter their email fresh in the checkout.
        metadata: {
          user_id: user.id,
          user_email: email, // Store email in metadata for webhook processing
        },
      });

      return NextResponse.json({
        checkoutUrl: checkout.url,
        checkoutId: checkout.id,
      });
    } catch (error: any) {
      console.error("Polar API error:", {
        error: error.message,
        statusCode: error.statusCode,
        body: error.body,
      });

      // Provide more specific error message based on error type
      let errorMessage = "Failed to create checkout session";
      
      if (error.statusCode === 401) {
        errorMessage = "Invalid API credentials. Please contact support.";
      } else if (error.statusCode === 404) {
        errorMessage = "Product not found. Please contact support.";
      } else if (error.statusCode === 400) {
        const errorBody = error.body || error.message || "";
        const errorLower = errorBody.toLowerCase();
        if (
          errorLower.includes("already") ||
          errorLower.includes("subscription") ||
          errorLower.includes("existing")
        ) {
          errorMessage =
            "This email already has a subscription. Please use a different email or contact support.";
        } else {
          errorMessage = error.message || "Invalid request. Please check your configuration.";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: error.statusCode || 500 }
      );
    }
  } catch (error) {
    console.error("Error creating checkout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
