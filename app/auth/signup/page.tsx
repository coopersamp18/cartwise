"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { ChefHat, ArrowLeft, Check } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-20">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="font-serif text-2xl font-bold mb-4">Check your email</h1>
              <p className="text-muted-foreground mb-2">
                We&apos;ve sent a confirmation link to:
              </p>
              <p className="text-foreground font-medium mb-6">{email}</p>
            </div>

            {/* Instructions Card */}
            <div className="card p-6 mb-6">
              <h2 className="font-semibold mb-4 text-sm">Next steps:</h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                    1
                  </span>
                  <span>Open your email inbox and look for our confirmation email</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                    2
                  </span>
                  <span>Click the confirmation link in the email</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                    3
                  </span>
                  <span>You&apos;ll be redirected back here and can start using Cartwise</span>
                </li>
              </ol>
            </div>

            {/* Troubleshooting */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-amber-900 text-sm font-medium mb-2">
                Don&apos;t see the email?
              </p>
              <ul className="text-amber-800 text-xs space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure you entered the correct email address</li>
                <li>• Wait a few minutes - it can take up to 5 minutes to arrive</li>
              </ul>
            </div>

            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => router.push("/auth/login")}
            >
              Back to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Signup Form */}
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
              Create your account
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Start organizing your recipes today
            </p>

            <form onSubmit={handleSignup} className="space-y-6">
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

              <Input
                id="confirmPassword"
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Create account
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 space-y-3">
            <p className="text-sm text-muted-foreground text-center">What you&apos;ll get:</p>
            <ul className="space-y-2">
              {[
                "Unlimited recipe storage",
                "AI-powered recipe extraction",
                "Smart shopping lists by aisle",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
