"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { ChefHat, Check, Sparkles, LogOut } from "lucide-react";

export default function SubscribePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get the user's email
    const getUserEmail = async () => {
      try {
        setIsLoadingEmail(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        } else {
          // If no user, redirect to login
          router.push("/auth/login");
        }
      } catch (err) {
        console.error("Error getting user email:", err);
        setError("Unable to load your account. Please try again.");
      } finally {
        setIsLoadingEmail(false);
      }
    };

    getUserEmail();
  }, [supabase, router]);

  const handleStartTrial = async () => {
    // Validate email is loaded
    if (!email) {
      setError("Please wait while we load your account information.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Call our API to create a Polar checkout session
      const response = await fetch("/api/polar/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone();
      let data;
      
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not JSON, get text instead
        const text = await responseClone.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server error: ${response.status} ${response.statusText}. ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        // Check if user already has a subscription
        if (data?.hasSubscription || data?.error?.includes("already have") || data?.error?.includes("already used")) {
          // Redirect to subscription settings if they already have a subscription
          router.push("/dashboard/subscription");
          return;
        }
        
        // Try to get a more specific error message
        const errorMessage = data?.error || data?.message || "Failed to create checkout session";
        console.error("Checkout error details:", {
          status: response.status,
          statusText: response.statusText,
          error: data,
        });
        throw new Error(errorMessage);
      }

      // Redirect to Polar checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error("Error starting trial:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unable to start your trial. Please try again or contact support.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      console.error("Error signing out:", err);
      setError("Unable to sign out. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ChefHat className="w-10 h-10 text-primary" />
          <span className="font-serif text-2xl font-bold">Cartwise</span>
        </div>

        {/* Main Card */}
        <div className="card p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            Start Your Free Trial
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            Get full access to Cartwise for 3 days, then just $5/month to
            continue.
          </p>

          {/* Pricing Box */}
          <div className="bg-muted/30 rounded-2xl p-6 mb-8">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl font-bold">$5</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Cancel anytime • 3-day free trial
            </p>
          </div>

          {/* Features List */}
          <div className="text-left max-w-md mx-auto mb-8 space-y-3">
            {[
              "Unlimited recipe storage",
              "AI-powered recipe extraction from any website",
              "Smart shopping lists organized by aisle",
              "Access from any device",
              "Regular updates and new features",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* CTA Button */}
          <Button
            onClick={handleStartTrial}
            isLoading={isLoading || isLoadingEmail}
            disabled={isLoadingEmail || !email}
            className="w-full md:w-auto px-12 py-6 text-lg"
            size="lg"
          >
            {isLoadingEmail ? "Loading..." : "Start Free Trial"}
          </Button>

          <p className="text-xs text-muted-foreground mt-6">
            Your trial starts today and you won&apos;t be charged until after 3
            days.
            <br />
            Cancel anytime before then at no cost.
          </p>

          {/* Account Info & Sign Out */}
          {email && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Subscribing with: <span className="font-medium text-foreground">{email}</span>
              </p>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Using a different account? Sign out here
              </button>
            </div>
          )}
        </div>

        {/* Trust Badge */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Secure checkout powered by Polar
        </p>
      </div>
    </div>
  );
}
