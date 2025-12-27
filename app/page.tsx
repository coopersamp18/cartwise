import Link from "next/link";
import { BookOpen, ShoppingCart, Sparkles, ArrowRight, ChefHat } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <span className="font-serif text-xl font-bold">Cartwise</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              href="/auth/login" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/auth/signup" 
              className="btn-primary"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Recipe Management
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
            Save recipes. Shop smarter.
            <br />
            <span className="text-primary">Cook with ease.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Extract recipes from any URL or paste them directly. Cartwise organizes your ingredients by supermarket aisle, making grocery shopping effortless.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/auth/login" className="btn-secondary text-lg px-8 py-4">
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Everything you need to organize your recipes
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From saving recipes to shopping for ingredients, Cartwise handles it all.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card p-8">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">AI Recipe Extraction</h3>
              <p className="text-muted-foreground">
                Paste a URL or recipe text and our AI instantly extracts ingredients and instructions. No more manual copying.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-8">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Your Recipe Book</h3>
              <p className="text-muted-foreground">
                All your favorite recipes in one place, organized by category. Access them anytime, anywhere.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-8">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <ShoppingCart className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Smart Shopping Lists</h3>
              <p className="text-muted-foreground">
                Select recipes and generate a shopping list automatically organized by supermarket aisle. Shop efficiently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
          </div>

          <div className="space-y-12">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-serif font-bold text-xl flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">Add your recipes</h3>
                <p className="text-muted-foreground">
                  Paste a recipe URL or copy the recipe text directly. Our AI will automatically extract the title, ingredients, and cooking instructions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-serif font-bold text-xl flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">Build your recipe book</h3>
                <p className="text-muted-foreground">
                  Save recipes to your personal collection. They&apos;re automatically categorized and easy to search through.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-serif font-bold text-xl flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">Generate your shopping list</h3>
                <p className="text-muted-foreground">
                  Select the recipes you want to cook this week. Cartwise combines all ingredients and organizes them by supermarket aisle for efficient shopping.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            Ready to simplify your cooking?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join Cartwise today and spend less time planning, more time cooking.
          </p>
          <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
            Get started for free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            <span className="font-serif font-bold">Cartwise</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Cartwise. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
