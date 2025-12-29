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
      console.log("[billing-info] Customer data:", JSON.stringify(customer, null, 2));

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
            console.log("[billing-info] Subscription data:", JSON.stringify(subscriptionDetails, null, 2));
          }
        } catch (subError) {
          console.error("Error fetching subscription details:", subError);
        }
      }

      // Try to extract payment method info from subscription or customer
      let paymentMethod = null;
      
      // Check subscription first
      if (subscriptionDetails) {
        // Try various possible locations for payment method info
        const pm = subscriptionDetails.payment_method || 
                   subscriptionDetails.default_payment_method ||
                   subscriptionDetails.customer?.default_payment_method ||
                   subscriptionDetails.latest_invoice?.payment_intent?.payment_method;
        
        if (pm) {
          console.log("[billing-info] Found payment method in subscription:", pm);
          paymentMethod = {
            type: pm.type || null,
            last4: pm.last4 || pm.card?.last4 || null,
            brand: pm.brand || pm.card?.brand || null,
            expiryMonth: pm.exp_month || pm.card?.exp_month || null,
            expiryYear: pm.exp_year || pm.card?.exp_year || null,
          };
        }
      }
      
      // If not found in subscription, check customer
      if (!paymentMethod && customer) {
        const pm = customer.default_payment_method || customer.payment_method;
        if (pm) {
          console.log("[billing-info] Found payment method in customer:", pm);
          paymentMethod = {
            type: pm.type || null,
            last4: pm.last4 || pm.card?.last4 || null,
            brand: pm.brand || pm.card?.brand || null,
            expiryMonth: pm.exp_month || pm.card?.exp_month || null,
            expiryYear: pm.exp_year || pm.card?.exp_year || null,
          };
        }
      }
      
      // Try to fetch payment methods separately if available
      if (!paymentMethod && subscription.polar_customer_id) {
        try {
          const pmResponse = await fetch(
            `${baseUrl}/v1/customers/${subscription.polar_customer_id}/payment_methods`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          if (pmResponse.ok) {
            const paymentMethods = await pmResponse.json();
            console.log("[billing-info] Payment methods response:", JSON.stringify(paymentMethods, null, 2));
            
            const methods = paymentMethods.results || paymentMethods.data || paymentMethods || [];
            if (methods.length > 0) {
              const defaultPm = methods.find((m: any) => m.is_default) || methods[0];
              if (defaultPm) {
                paymentMethod = {
                  type: defaultPm.type || null,
                  last4: defaultPm.last4 || defaultPm.card?.last4 || null,
                  brand: defaultPm.brand || defaultPm.card?.brand || null,
                  expiryMonth: defaultPm.exp_month || defaultPm.card?.exp_month || null,
                  expiryYear: defaultPm.exp_year || defaultPm.card?.exp_year || null,
                };
              }
            }
          } else {
            const errorText = await pmResponse.text();
            console.log("[billing-info] Payment methods endpoint response:", pmResponse.status, errorText);
          }
        } catch (pmError) {
          console.log("[billing-info] Payment methods endpoint not available or error:", pmError);
        }
      }

      // Try to get payment method from latest invoice if available
      if (!paymentMethod && subscription.polar_subscription_id) {
        try {
          // Fetch latest invoice to get payment method info
          const invoicesResponse = await fetch(
            `${baseUrl}/v1/invoices?subscription_id=${subscription.polar_subscription_id}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json();
            const invoices = invoicesData.results || invoicesData.data || invoicesData.items || [];
            if (invoices.length > 0) {
              const latestInvoice = invoices[0];
              console.log("[billing-info] Latest invoice:", JSON.stringify(latestInvoice, null, 2));
              
              // Check invoice for payment method info
              const invoicePm = latestInvoice.payment_method || 
                               latestInvoice.payment_intent?.payment_method ||
                               latestInvoice.charge?.payment_method;
              
              if (invoicePm) {
                paymentMethod = {
                  type: invoicePm.type || null,
                  last4: invoicePm.last4 || invoicePm.card?.last4 || null,
                  brand: invoicePm.brand || invoicePm.card?.brand || null,
                  expiryMonth: invoicePm.exp_month || invoicePm.card?.exp_month || null,
                  expiryYear: invoicePm.exp_year || invoicePm.card?.exp_year || null,
                };
              }
            }
          }
        } catch (invoiceError) {
          console.log("[billing-info] Error fetching invoice for payment method:", invoiceError);
        }
      }
      
      console.log("[billing-info] Final payment method:", paymentMethod);

      // Note: Polar may not expose full payment method details via API for PCI compliance
      // If paymentMethod is null, users can update/view it via the customer portal

      // Extract billing information
      const billingInfo = {
        email: customer.email || user.email,
        name: customer.name || null,
        customerId: customer.id,
        createdAt: customer.created_at,
        // Additional fields from customer object if available
        metadata: customer.metadata || {},
        paymentMethod,
        // Include raw data for debugging
        _debug: {
          hasCustomer: !!customer,
          hasSubscription: !!subscriptionDetails,
          customerKeys: customer ? Object.keys(customer) : [],
          subscriptionKeys: subscriptionDetails ? Object.keys(subscriptionDetails) : [],
        },
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
