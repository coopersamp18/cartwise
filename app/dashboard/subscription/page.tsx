"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import { Subscription } from "@/lib/types";
import { 
  getSubscriptionClient, 
  isSubscriptionActive, 
  getTrialDaysRemaining 
} from "@/lib/subscription-client";
import { ChefHat, CreditCard, Calendar, AlertCircle, CheckCircle, XCircle, ExternalLink, Loader2, FileText } from "lucide-react";
import { ProfileDropdown } from "@/components/ProfileDropdown";

export default function SubscriptionPage() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/auth/login");
          return;
        }

        setUser(authUser);
        const sub = await getSubscriptionClient(authUser.id);
        setSubscription(sub);
        
        // Load billing information if subscription exists
        if (sub) {
          loadBillingInfo();
          loadBillingHistory();
        }
      } catch (error) {
        console.error("Error loading subscription:", error);
        setError("Failed to load subscription data");
      } finally {
        setIsLoading(false);
      }
    };

    const loadBillingInfo = async () => {
      setIsLoadingBilling(true);
      try {
        const response = await fetch("/api/polar/billing-info");
        if (response.ok) {
          const data = await response.json();
          console.log("[subscription-page] Billing info data:", data);
          setBillingInfo(data.billingInfo);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to load billing information:", response.status, errorData);
        }
      } catch (error) {
        console.error("Error loading billing information:", error);
      } finally {
        setIsLoadingBilling(false);
      }
    };

    const loadBillingHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch("/api/polar/billing-history");
        if (response.ok) {
          const data = await response.json();
          console.log("[subscription-page] Billing history data:", data);
          setBillingHistory(data.invoices || []);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to load billing history:", response.status, errorData);
        }
      } catch (error) {
        console.error("Error loading billing history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadData();

    // Check for payment update success
    if (searchParams.get("payment_updated") === "true") {
      setSuccess("Payment method updated successfully!");
      // Remove query param from URL
      router.replace("/dashboard/subscription", { scroll: false });
      // Reload billing info
      setTimeout(() => {
        loadBillingInfo();
        loadBillingHistory();
      }, 1000);
    }
  }, [supabase, router, searchParams]);

  const handleOpenCustomerPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const response = await fetch("/api/polar/customer-portal");
      const data = await response.json();
      
      if (response.ok && data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        setError(data.error || "Failed to open customer portal");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      setError("Failed to open customer portal. Please try again.");
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    setIsUpdatingPayment(true);
    setError("");
    try {
      const response = await fetch("/api/polar/update-payment-method", {
        method: "POST",
      });
      const data = await response.json();
      
      if (response.ok && data.checkoutUrl) {
        // Open in a new window
        const paymentWindow = window.open(
          data.checkoutUrl,
          "_blank",
          "width=600,height=700,scrollbars=yes"
        );
        
        // Listen for when the window closes to refresh billing info
        const checkClosed = setInterval(() => {
          if (paymentWindow?.closed) {
            clearInterval(checkClosed);
            // Reload billing info after payment update
            loadBillingInfo();
            loadBillingHistory();
          }
        }, 500);
      } else {
        setError(data.error || "Failed to open payment update");
      }
    } catch (error) {
      console.error("Error updating payment method:", error);
      setError("Failed to update payment method. Please try again.");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleReactivate = async () => {
    if (!subscription) return;

    setIsReactivating(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/polar/reactivate-subscription", {
        method: "POST",
      });

      const data = await response.json();
      
      if (response.ok) {
        // Refresh subscription data
        if (user) {
          const updated = await getSubscriptionClient(user.id);
          setSubscription(updated);
        }
        setSuccess("Subscription reactivated successfully! Your card will be charged and your subscription will continue.");
      } else {
        setError(data.error || "Failed to reactivate subscription");
      }
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      setError("Failed to reactivate subscription. Please try again.");
    } finally {
      setIsReactivating(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;

    if (!confirm("Are you sure you want to cancel your subscription? You'll have access until the end of your billing period.")) {
      return;
    }

    setIsCanceling(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/polar/cancel-subscription", {
        method: "POST",
      });

      const data = await response.json();
      
      if (response.ok) {
        // Refresh subscription data
        if (user) {
          const updated = await getSubscriptionClient(user.id);
          setSubscription(updated);
        }
        setSuccess("Subscription canceled. You'll have access until the end of your billing period.");
      } else {
        setError(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      setError("Failed to cancel subscription. Please try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isActive = subscription ? isSubscriptionActive(subscription) : false;
  const trialDays = subscription ? getTrialDaysRemaining(subscription) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <span className="font-serif text-xl font-bold">Cartwise</span>
          </Link>
          <ProfileDropdown />
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold mb-2">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="py-4">
              <p className="text-sm text-green-600">{success}</p>
            </CardContent>
          </Card>
        )}

        {!subscription ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-serif text-xl font-bold mb-2">No Active Subscription</h2>
              <p className="text-muted-foreground mb-6">
                Subscribe to unlock all features of Cartwise
              </p>
              <Button onClick={() => router.push("/auth/subscribe")}>
                Subscribe Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <Card>
              <CardHeader>
                <h2 className="font-serif text-xl font-bold">Current Plan</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">Cartwise Premium</p>
                    <p className="text-sm text-muted-foreground">$5/month</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                    isActive 
                      ? "bg-green-100 text-green-800" 
                      : subscription.status === "canceled"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {subscription.status === "trial" && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {subscription.status === "canceled" && (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {!isActive && subscription.status !== "canceled" && (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>{subscription.status.toUpperCase()}</span>
                  </div>
                </div>

                {subscription.status === "trial" && trialDays > 0 && (
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
                    <Calendar className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{trialDays} {trialDays === 1 ? "day" : "days"} remaining in trial</p>
                      <p className="text-xs text-blue-600/70">
                        Your subscription will start automatically after the trial ends
                      </p>
                    </div>
                  </div>
                )}

                {subscription.current_period_end && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {subscription.status === "canceled" 
                        ? "Access until" 
                        : subscription.status === "trial"
                        ? "Trial ends"
                        : "Next billing date"}: {" "}
                      <span className="font-medium">
                        {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </span>
                    </span>
                  </div>
                )}

                {subscription.status === "canceled" && subscription.current_period_end && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Subscription Canceled</p>
                      <p className="text-xs text-amber-600/70">
                        Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}. You&apos;ll continue to have access until then.
                      </p>
                    </div>
                  </div>
                )}

                {subscription.status === "canceled" && (
                  <div className="pt-4 border-t border-border">
                    <Button 
                      onClick={handleReactivate}
                      disabled={isReactivating}
                      className="w-full"
                    >
                      {isReactivating ? "Reactivating..." : "Reactivate Subscription"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Your subscription will be reactivated and your card on file will be charged
                    </p>
                  </div>
                )}

                {isActive && subscription.status !== "canceled" && (
                  <div className="pt-4 border-t border-border">
                    <Button 
                      variant="secondary" 
                      onClick={handleCancel}
                      disabled={isCanceling}
                      className="w-full"
                    >
                      {isCanceling ? "Canceling..." : "Cancel Subscription"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      You&apos;ll continue to have access until the end of your billing period
                    </p>
                  </div>
                )}

                {!isActive && subscription.status !== "canceled" && (
                  <div className="pt-4">
                    <Button 
                      onClick={handleReactivate}
                      disabled={isReactivating}
                      className="w-full"
                    >
                      {isReactivating ? "Reactivating..." : "Reactivate Subscription"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <h2 className="font-serif text-xl font-bold">Billing Information</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Method Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Payment Method
                    </h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleUpdatePaymentMethod}
                      disabled={isUpdatingPayment}
                    >
                      {isUpdatingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Update
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {billingInfo?.paymentMethod && (billingInfo.paymentMethod.last4 || billingInfo.paymentMethod.type) ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {billingInfo.paymentMethod.brand 
                              ? `${billingInfo.paymentMethod.brand.charAt(0).toUpperCase() + billingInfo.paymentMethod.brand.slice(1)}` 
                              : billingInfo.paymentMethod.type 
                              ? billingInfo.paymentMethod.type.charAt(0).toUpperCase() + billingInfo.paymentMethod.type.slice(1)
                              : "Card"} 
                            {billingInfo.paymentMethod.last4 ? ` •••• ${billingInfo.paymentMethod.last4}` : ""}
                          </p>
                          {billingInfo.paymentMethod.expiryMonth && billingInfo.paymentMethod.expiryYear && (
                            <p className="text-sm text-muted-foreground">
                              Expires {String(billingInfo.paymentMethod.expiryMonth).padStart(2, '0')}/{billingInfo.paymentMethod.expiryYear}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    isLoadingBilling && (
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          Loading payment method...
                        </p>
                      </div>
                    )
                  )}
                </div>

                {/* Billing Details */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Account Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{billingInfo?.email || user?.email || "N/A"}</span>
                    </div>
                    {billingInfo?.name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">{billingInfo.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member since</span>
                      <span className="font-medium">
                        {new Date(subscription.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                  {isLoadingBilling && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Billing History */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Billing History
                    </h3>
                    {isLoadingHistory && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  
                  {billingHistory.length > 0 ? (
                    <div className="space-y-2">
                      {billingHistory.slice(0, 5).map((invoice: any) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                ${invoice.amount_total ? (invoice.amount_total / 100).toFixed(2) : (invoice.amount ? (invoice.amount / 100).toFixed(2) : "0.00")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {invoice.created_at
                                  ? new Date(invoice.created_at).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric"
                                    })
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {invoice.status === "paid" && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">
                              {invoice.status || "pending"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !isLoadingHistory ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No billing history available
                    </p>
                  ) : null}
                </div>

                {/* Alternative Portal Access */}
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenCustomerPortal}
                    disabled={isOpeningPortal}
                    className="w-full"
                  >
                    {isOpeningPortal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Full Customer Portal
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Access advanced billing management options in the customer portal
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
