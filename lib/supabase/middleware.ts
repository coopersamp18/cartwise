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
      .select("status,trial_ends_at,current_period_end")
      .eq("user_id", user.id)
      .single();

    if (!subscription) {
      // No subscription record - redirect to subscribe page
      const url = request.nextUrl.clone();
      url.pathname = "/auth/subscribe";
      return NextResponse.redirect(url);
    }

    // Check if user has access (including canceled subscriptions until period ends)
    const now = new Date();
    
    // Payment failure statuses that should immediately block access
    const isPaymentFailed =
      subscription.status === "past_due" ||
      subscription.status === "unpaid" ||
      subscription.status === "revoked" ||
      subscription.status === "expired" ||
      subscription.status === "inactive";

    if (isPaymentFailed) {
      // Payment failed - redirect to subscribe page
      const url = request.nextUrl.clone();
      url.pathname = "/auth/subscribe";
      return NextResponse.redirect(url);
    }

    // For canceled subscriptions, check if period hasn't ended yet
    if (subscription.status === "canceled") {
      const hasTrialAccess =
        subscription.trial_ends_at &&
        new Date(subscription.trial_ends_at) > now;
      const hasPeriodAccess =
        subscription.current_period_end &&
        new Date(subscription.current_period_end) > now;

      if (!hasTrialAccess && !hasPeriodAccess) {
        // Canceled and period has ended - redirect to subscribe page
        const url = request.nextUrl.clone();
        url.pathname = "/auth/subscribe";
        return NextResponse.redirect(url);
      }
      // Canceled but period hasn't ended - allow access
    } else {
      // For non-canceled subscriptions, check if active or trial is valid
      const isTrialActive =
        subscription.status === "trial" &&
        subscription.trial_ends_at &&
        new Date(subscription.trial_ends_at) > now;

      const isSubscriptionActive =
        subscription.status === "active" &&
        subscription.current_period_end &&
        new Date(subscription.current_period_end) > now;

      if (!isTrialActive && !isSubscriptionActive) {
        // Subscription expired - redirect to subscribe page
        const url = request.nextUrl.clone();
        url.pathname = "/auth/subscribe";
        return NextResponse.redirect(url);
      }
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
