import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSubscription } from "@/lib/subscription";
import { isPolarSandbox } from "@/lib/polar";

export async function GET(request: Request) {
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

    // Fetch invoices for the customer - try different endpoints
    let invoices: any[] = [];
    
    // Try subscription-specific invoices first (most reliable)
    if (subscription.polar_subscription_id) {
      try {
        const subInvoicesResponse = await fetch(
          `${baseUrl}/v1/invoices?subscription_id=${subscription.polar_subscription_id}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (subInvoicesResponse.ok) {
          const subInvoicesData = await subInvoicesResponse.json();
          console.log("[billing-history] Subscription invoices response:", JSON.stringify(subInvoicesData, null, 2));
          invoices = subInvoicesData.results || subInvoicesData.data || subInvoicesData.items || (Array.isArray(subInvoicesData) ? subInvoicesData : []);
        } else {
          const errorText = await subInvoicesResponse.text();
          console.warn("[billing-history] Failed to fetch subscription invoices:", subInvoicesResponse.status, errorText);
        }
      } catch (error) {
        console.warn("[billing-history] Error fetching subscription invoices:", error);
      }
    }
    
    // If no invoices found, try customer-specific invoices endpoint
    if (invoices.length === 0) {
      try {
        const invoicesResponse = await fetch(
          `${baseUrl}/v1/invoices?customer_id=${subscription.polar_customer_id}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (invoicesResponse.ok) {
          const invoicesData = await invoicesResponse.json();
          console.log("[billing-history] Customer invoices response:", JSON.stringify(invoicesData, null, 2));
          invoices = invoicesData.results || invoicesData.data || invoicesData.items || (Array.isArray(invoicesData) ? invoicesData : []);
        } else {
          const errorText = await invoicesResponse.text();
          console.warn("[billing-history] Failed to fetch customer invoices:", invoicesResponse.status, errorText);
        }
      } catch (error) {
        console.warn("[billing-history] Error fetching customer invoices:", error);
      }
    }

    // Try orders endpoint as alternative (Polar might use orders instead of invoices)
    if (invoices.length === 0) {
      try {
        const ordersResponse = await fetch(
          `${baseUrl}/v1/orders?customer_id=${subscription.polar_customer_id}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          console.log("[billing-history] Orders response:", JSON.stringify(ordersData, null, 2));
          const orders = ordersData.results || ordersData.data || ordersData.items || [];
          // Convert orders to invoice-like format
          invoices = orders.map((order: any) => ({
            id: order.id,
            amount_total: order.amount_total || order.amount,
            amount: order.amount,
            status: order.status,
            created_at: order.created_at,
            currency: order.currency,
          }));
        }
      } catch (error) {
        console.warn("[billing-history] Error fetching orders:", error);
      }
    }

    return NextResponse.json({
      invoices: invoices || [],
    });
  } catch (error: any) {
    console.error("Error fetching billing history:", error);
    // Return empty array on error so UI doesn't break
    return NextResponse.json({
      invoices: [],
      error: error.message || "Failed to fetch billing history",
    });
  }
}
