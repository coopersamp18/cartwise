import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription } from "@/lib/subscription";
import { createPolarClient, getPolarProductId } from "@/lib/polar";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscription(user.id);
    if (!subscription || !subscription.polar_customer_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const polar = createPolarClient();
    const productId = getPolarProductId();

    const origin =
      request.headers.get("origin") ||
      request.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "http://localhost:3000";

    // Create a checkout session for updating payment method
    // This will allow the user to update their payment method without creating a new subscription
    const checkout = await polar.checkouts.create({
      customerId: subscription.polar_customer_id,
      products: [productId],
      successUrl: `${origin}/dashboard/subscription?payment_updated=true`,
      returnUrl: `${origin}/dashboard/subscription`,
      metadata: {
        user_id: user.id,
        action: "update_payment_method",
      },
    });

    return NextResponse.json({
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    });
  } catch (error: any) {
    console.error("Error creating payment update checkout:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment update session" },
      { status: 500 }
    );
  }
}
