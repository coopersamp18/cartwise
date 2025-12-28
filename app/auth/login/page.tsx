"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { ChefHat, ArrowLeft, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsEmailNotConfirmed(false);
    setResendSuccess(false);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if the error is due to unconfirmed email
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setIsEmailNotConfirmed(true);
          setError("Your email address hasn't been confirmed yet.");
        } else {
          setError(error.message);
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setIsResendingEmail(true);
    setError("");
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setResendSuccess(true);
      }
    } catch {
      setError("Failed to resend confirmation email");
    } finally {
      setIsResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back Link */}
      <div className="p-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <ChefHat className="w-10 h-10 text-primary" />
            <span className="font-serif text-2xl font-bold">Cartwise</span>
          </div>

          {/* Form Card */}
          <div className="card p-8">
            <h1 className="font-serif text-2xl font-bold text-center mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Sign in to your account to continue
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-600 text-sm font-medium">{error}</p>
                      {isEmailNotConfirmed && (
                        <div className="mt-3 space-y-2">
                          <p className="text-red-600 text-xs">
                            Please check your inbox (and spam folder) for the confirmation email we sent you.
                          </p>
                          <button
                            type="button"
                            onClick={handleResendConfirmation}
                            disabled={isResendingEmail}
                            className="text-xs text-red-700 hover:text-red-800 underline font-medium disabled:opacity-50"
                          >
                            {isResendingEmail ? "Sending..." : "Resend confirmation email"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {resendSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-green-700 text-sm font-medium">
                        Confirmation email sent!
                      </p>
                      <p className="text-green-600 text-xs mt-1">
                        Check your inbox at <strong>{email}</strong> for the confirmation link. 
                        Don&apos;t forget to check your spam folder.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Sign in
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
