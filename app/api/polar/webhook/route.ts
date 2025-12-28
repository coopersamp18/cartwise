import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Verify webhook signature from Polar
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

export async function POST(request: Request) {
  try {
    // Determine if we're using sandbox or production
    const useSandbox = process.env.POLAR_USE_SANDBOX === "true";
    
    // Select appropriate webhook secret based on environment
    const webhookSecret = useSandbox
      ? process.env.POLAR_SANDBOX_WEBHOOK_SECRET || process.env.POLAR_WEBHOOK_SECRET
      : process.env.POLAR_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("POLAR_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("x-polar-signature");

    if (!signature) {
      console.error("Missing webhook signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Verify the webhook signature
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the webhook event
    const event = JSON.parse(body);
    const eventType = event.type;

    console.log("Received Polar webhook:", {
      type: eventType,
      eventId: event.id,
      timestamp: event.timestamp,
      hasData: !!event.data,
    });

    // Use service role client to bypass RLS for webhook operations
    const supabase = createServiceRoleClient();

    // Handle different event types
    switch (eventType) {
      case "checkout.completed": {
        // When checkout is completed, create subscription with trial
        const userId = event.data.metadata?.user_id;
        const customerId = event.data.customer_id;
        const subscriptionId = event.data.subscription_id;

        console.log("Processing checkout.completed:", {
          userId,
          customerId,
          subscriptionId,
          eventData: event.data,
        });

        if (!userId) {
          console.error("No user_id in checkout metadata. Event data:", JSON.stringify(event.data, null, 2));
          return NextResponse.json(
            { error: "Missing user_id in metadata" },
            { status: 400 }
          );
        }

        // Calculate trial end date (3 days from now)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 3);

        const { data: subscription, error: upsertError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              polar_customer_id: customerId,
              polar_subscription_id: subscriptionId,
              status: "trial",
              trial_ends_at: trialEndsAt.toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          )
          .select()
          .single();

        if (upsertError) {
          console.error("Error creating subscription:", upsertError);
          return NextResponse.json(
            { error: "Failed to create subscription", details: upsertError.message },
            { status: 500 }
          );
        }

        console.log("Successfully created trial subscription:", {
          userId,
          subscriptionId,
          subscription,
        });
        break;
      }

      case "subscription.active": {
        // When subscription becomes active (after trial or payment)
        const subscriptionId = event.data.id;
        const currentPeriodEnd = event.data.current_period_end;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("polar_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription to active:", error);
        } else {
          console.log("Updated subscription to active:", subscriptionId);
        }
        break;
      }

      case "subscription.canceled": {
        // When subscription is canceled
        const subscriptionId = event.data.id;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("polar_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription to canceled:", error);
        } else {
          console.log("Updated subscription to canceled:", subscriptionId);
        }
        break;
      }

      case "subscription.updated": {
        // When subscription details are updated (includes payment failures)
        const subscriptionId = event.data.id;
        const currentPeriodEnd = event.data.current_period_end;
        const polarStatus = event.data.status;

        // Map Polar statuses to our database statuses
        let mappedStatus: string;
        switch (polarStatus) {
          case "active":
            mappedStatus = "active";
            break;
          case "past_due":
            mappedStatus = "past_due";
            break;
          case "unpaid":
            mappedStatus = "unpaid";
            break;
          case "canceled":
            mappedStatus = "canceled";
            break;
          case "trialing":
            mappedStatus = "trial";
            break;
          default:
            // For any other status, map to inactive
            mappedStatus = "inactive";
        }

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: mappedStatus,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("polar_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription:", error);
        } else {
          console.log("Updated subscription:", {
            subscriptionId,
            polarStatus,
            mappedStatus,
          });
        }
        break;
      }

      case "subscription.revoked": {
        // When subscription is immediately revoked (e.g., due to payment failure)
        const subscriptionId = event.data.id;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "revoked",
            updated_at: new Date().toISOString(),
          })
          .eq("polar_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription to revoked:", error);
        } else {
          console.log("Updated subscription to revoked:", subscriptionId);
        }
        break;
      }

      default:
        console.log("Unhandled webhook event type:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
