import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { getPolarWebhookSecret, isPolarSandbox } from "@/lib/polar";

// Prevent Next.js from parsing the body
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Get webhook secret for current environment
    let webhookSecret: string;
    try {
      webhookSecret = getPolarWebhookSecret();
    } catch (error) {
      console.error("Webhook secret not configured:", error);
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    console.log("Webhook environment:", {
      useSandbox: isPolarSandbox(),
      hasSecret: !!webhookSecret,
    });

    // Get the raw body for signature verification
    const body = await request.text();

    // Convert Headers to plain object for SDK
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log("Webhook headers received:", {
      hasSignature: !!headers["webhook-signature"],
      hasTimestamp: !!headers["webhook-timestamp"],
      hasWebhookId: !!headers["webhook-id"],
      bodyLength: body.length,
    });

    // Verify webhook signature using Polar SDK
    let event: any;
    try {
      // Validate the signature
      validateEvent(body, headers, webhookSecret);
      console.log("Webhook signature verified successfully");
      
      // Parse the body directly to ensure we get all fields
      event = JSON.parse(body);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        console.error("Invalid webhook signature:", error.message);
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
      throw error;
    }

    const eventType = event.type;

    console.log("Received Polar webhook:", {
      type: eventType,
      timestamp: event.timestamp,
      hasData: !!event.data,
    });

    // Use service role client to bypass RLS for webhook operations
    const supabase = createServiceRoleClient();

    // Handle different event types
    switch (eventType) {
      case "subscription.created": {
        // When a new subscription is created (primary event for creating subscription records)
        const subscriptionId = event.data.id;
        const customerId = event.data.customer_id;
        const userId = event.data.metadata?.user_id;
        const currentPeriodEnd = event.data.current_period_end;
        const polarStatus = event.data.status;

        console.log("Processing subscription.created:", {
          userId,
          customerId,
          subscriptionId,
          polarStatus,
          metadata: event.data.metadata,
        });

        if (!userId) {
          console.error(
            "No user_id in subscription metadata. Event data:",
            JSON.stringify(event.data, null, 2)
          );
          return NextResponse.json(
            { error: "Missing user_id in metadata" },
            { status: 400 }
          );
        }

        // Map Polar status to our database status
        let mappedStatus: string;
        let trialEndsAt: Date | null = null;

        switch (polarStatus) {
          case "trialing":
            mappedStatus = "trial";
            // Calculate trial end date (3 days from now)
            trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 3);
            break;
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
          default:
            mappedStatus = "inactive";
        }

        const { data: subscription, error: upsertError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              polar_customer_id: customerId,
              polar_subscription_id: subscriptionId,
              status: mappedStatus,
              trial_ends_at: trialEndsAt?.toISOString() || null,
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          )
          .select()
          .single();

        if (upsertError) {
          console.error("Error creating subscription:", {
            error: upsertError,
            userId,
            subscriptionId,
            customerId,
            status: mappedStatus,
          });
          return NextResponse.json(
            {
              error: "Failed to create subscription",
              details: upsertError.message,
            },
            { status: 500 }
          );
        }

        console.log("Successfully created subscription:", {
          userId,
          subscriptionId,
          customerId,
          status: mappedStatus,
          subscription,
        });
        break;
      }

      case "subscription.active": {
        // When subscription becomes active (after trial or payment)
        const subscriptionId = event.data.id;
        const customerId = event.data.customer_id;
        const currentPeriodEnd = event.data.current_period_end;

        console.log("Processing subscription.active:", {
          subscriptionId,
          customerId,
          currentPeriodEnd,
        });

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            polar_customer_id: customerId, // Ensure customer_id is set
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("polar_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription to active:", {
            error,
            subscriptionId,
            customerId,
          });
          return NextResponse.json(
            {
              error: "Failed to update subscription to active",
              details: error.message,
            },
            { status: 500 }
          );
        } else {
          console.log("Successfully updated subscription to active:", {
            subscriptionId,
            customerId,
          });
        }
        break;
      }

      case "subscription.canceled": {
        // When subscription is canceled (will still have access until period ends)
        const subscriptionId = event.data.id;
        const currentPeriodEnd = event.data.current_period_end;
        const canceledAt = event.data.canceled_at;

        console.log("Processing subscription.canceled:", {
          subscriptionId,
          canceledAt,
          currentPeriodEnd,
        });

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            current_period_end: currentPeriodEnd, // Keep period end so they have access until then
            updated_at: new Date().toISOString(),
          })
          .eq("polar_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription to canceled:", {
            error,
            subscriptionId,
          });
          return NextResponse.json(
            {
              error: "Failed to update subscription to canceled",
              details: error.message,
            },
            { status: 500 }
          );
        } else {
          console.log("Successfully updated subscription to canceled:", {
            subscriptionId,
            endsAt: currentPeriodEnd,
          });
        }
        break;
      }

      case "subscription.updated": {
        // When subscription details are updated (includes payment failures, status changes, etc.)
        const subscriptionId = event.data.id;
        const customerId = event.data.customer_id;
        const currentPeriodEnd = event.data.current_period_end;
        const polarStatus = event.data.status;

        console.log("Processing subscription.updated:", {
          subscriptionId,
          customerId,
          polarStatus,
          currentPeriodEnd,
        });

        // Map Polar statuses to our database statuses
        let mappedStatus: string;
        switch (polarStatus) {
          case "trialing":
            mappedStatus = "trial";
            break;
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
          default:
            // For any other status, map to inactive
            mappedStatus = "inactive";
        }

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: mappedStatus,
            polar_customer_id: customerId, // Ensure customer_id is always set
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("polar_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription:", {
            error,
            subscriptionId,
            customerId,
            polarStatus,
            mappedStatus,
          });
          return NextResponse.json(
            {
              error: "Failed to update subscription",
              details: error.message,
            },
            { status: 500 }
          );
        } else {
          console.log("Successfully updated subscription:", {
            subscriptionId,
            customerId,
            polarStatus,
            mappedStatus,
          });
        }
        break;
      }

      case "subscription.revoked": {
        // When subscription is immediately revoked (e.g., due to payment failure or fraud)
        // User loses access immediately, unlike canceled which waits until period end
        const subscriptionId = event.data.id;
        const revokedAt = event.data.revoked_at;

        console.log("Processing subscription.revoked:", {
          subscriptionId,
          revokedAt,
        });

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "revoked",
            current_period_end: null, // Clear period end since access is revoked immediately
            updated_at: new Date().toISOString(),
          })
          .eq("polar_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription to revoked:", {
            error,
            subscriptionId,
          });
          return NextResponse.json(
            {
              error: "Failed to update subscription to revoked",
              details: error.message,
            },
            { status: 500 }
          );
        } else {
          console.log("Successfully updated subscription to revoked:", {
            subscriptionId,
            revokedAt,
          });
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
