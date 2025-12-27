"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { ChefHat, Check, Loader2 } from "lucide-react";

export default function SubscribeSuccessPage() {
  const [isChecking, setIsChecking] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const checkSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth/login");
          return;
        }

        // Check if subscription exists
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (subscription) {
          setHasSubscription(true);
          setIsChecking(false);
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            // Retry after 2 seconds
            setTimeout(checkSubscription, 2000);
          } else {
            // After max attempts, assume success and let user proceed
            setHasSubscription(true);
            setIsChecking(false);
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkSubscription, 2000);
        } else {
          setHasSubscription(true);
          setIsChecking(false);
        }
      }
    };

    checkSubscription();
  }, [supabase, router]);

  const handleContinue = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ChefHat className="w-10 h-10 text-primary" />
          <span className="font-serif text-2xl font-bold">Cartwise</span>
        </div>

        {/* Success Card */}
        <div className="card p-8 text-center">
          {isChecking ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h1 className="font-serif text-2xl font-bold mb-4">
                Activating Your Trial...
              </h1>
              <p className="text-muted-foreground mb-6">
                Please wait while we set up your account.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="font-serif text-2xl font-bold mb-4">
                Welcome to Cartwise!
              </h1>
              <p className="text-muted-foreground mb-6">
                Your 3-day free trial has started. You now have full access to
                all features.
              </p>

              {/* Trial Info */}
              <div className="bg-muted/30 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      Your trial is active for 3 days with full access
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      After 3 days, you&apos;ll be charged $5/month
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Cancel anytime before then at no cost</span>
                  </li>
                </ul>
              </div>

              <Button onClick={handleContinue} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
