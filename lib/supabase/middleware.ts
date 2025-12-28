import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - require authentication
  if (
    !user &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/recipe"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Check subscription for protected routes (but allow /auth/subscribe paths)
  if (
    user &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/recipe")) &&
    !request.nextUrl.pathname.startsWith("/auth/subscribe")
  ) {
    // Check if user has an active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!subscription) {
      // No subscription record - redirect to subscribe page
      const url = request.nextUrl.clone();
      url.pathname = "/auth/subscribe";
      return NextResponse.redirect(url);
    }

    // Check if subscription is active or trial is valid
    // Payment failure statuses (past_due, unpaid, revoked) should block access
    const now = new Date();
    const isTrialActive =
      subscription.status === "trial" &&
      subscription.trial_ends_at &&
      new Date(subscription.trial_ends_at) > now;

    const isSubscriptionActive =
      subscription.status === "active" &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) > now;

    // Block access for payment failure statuses
    const isPaymentFailed =
      subscription.status === "past_due" ||
      subscription.status === "unpaid" ||
      subscription.status === "revoked" ||
      subscription.status === "canceled" ||
      subscription.status === "expired" ||
      subscription.status === "inactive";

    if (isPaymentFailed || (!isTrialActive && !isSubscriptionActive)) {
      // Subscription expired or payment failed - redirect to subscribe page
      const url = request.nextUrl.clone();
      url.pathname = "/auth/subscribe";
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged in users away from auth pages (except subscribe pages)
  if (
    user &&
    request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/auth/subscribe")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
