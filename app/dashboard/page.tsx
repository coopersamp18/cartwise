"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { Recipe, ShoppingListItem, Subscription } from "@/lib/types";
import { 
  ChefHat, 
  Plus, 
  BookOpen, 
  ShoppingCart, 
  LogOut, 
  Clock, 
  Users,
  Check,
  Trash2,
  Square,
  CheckSquare
} from "lucide-react";

const AISLE_ORDER = [
  "Produce",
  "Bakery",
  "Deli",
  "Meat & Seafood",
  "Dairy",
  "Frozen",
  "Pantry",
  "Canned Goods",
  "Condiments",
  "Spices",
  "Beverages",
  "Snacks",
  "Other"
];

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);
  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      // Load recipes
      const { data: recipesData } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (recipesData) {
        setRecipes(recipesData);
      }

      // Load shopping list
      const { data: shoppingData } = await supabase
        .from("shopping_list")
        .select("*")
        .order("aisle_category", { ascending: true });

      if (shoppingData) {
        setShoppingList(shoppingData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadData();
        
        // Load subscription info
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (subData) {
          setSubscription(subData);
          
          // Calculate trial days remaining
          if (subData.status === "trial" && subData.trial_ends_at) {
            const now = new Date();
            const trialEnd = new Date(subData.trial_ends_at);
            const diffTime = trialEnd.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setTrialDaysRemaining(Math.max(0, diffDays));
          }
        }
      }
    };

    getUser();
  }, [supabase, loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const toggleRecipeSelection = async (recipeId: string, isSelected: boolean) => {
    // Update recipe selection
    await supabase
      .from("recipes")
      .update({ is_selected: !isSelected })
      .eq("id", recipeId);

    if (!isSelected) {
      // Add ingredients to shopping list
      const { data: ingredients } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipeId);

      if (ingredients && ingredients.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const shoppingItems = ingredients.map((ing) => ({
          user_id: user?.id,
          recipe_id: recipeId,
          ingredient_id: ing.id,
          name: ing.name,
          quantity: ing.quantity,
          aisle_category: ing.aisle_category,
          checked: false,
        }));

        await supabase.from("shopping_list").insert(shoppingItems);
      }
    } else {
      // Remove ingredients from shopping list
      await supabase
        .from("shopping_list")
        .delete()
        .eq("recipe_id", recipeId);
    }

    loadData();
  };

  const toggleShoppingItem = async (itemId: string, checked: boolean) => {
    await supabase
      .from("shopping_list")
      .update({ checked: !checked })
      .eq("id", itemId);

    setShoppingList((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked: !checked } : item
      )
    );
  };

  const clearCheckedItems = async () => {
    await supabase
      .from("shopping_list")
      .delete()
      .eq("checked", true);

    setShoppingList((prev) => prev.filter((item) => !item.checked));
  };

  const clearAllItems = async () => {
    // Clear all shopping list items
    await supabase
      .from("shopping_list")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    // Unselect all recipes
    await supabase
      .from("recipes")
      .update({ is_selected: false })
      .eq("is_selected", true);

    setShoppingList([]);
    loadData();
  };

  const groupedShoppingList = AISLE_ORDER.reduce((acc, aisle) => {
    const items = shoppingList.filter((item) => item.aisle_category === aisle);
    if (items.length > 0) {
      acc[aisle] = items;
    }
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  const deleteRecipe = async (recipeId: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    
    await supabase.from("recipes").delete().eq("id", recipeId);
    loadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <span className="font-serif text-xl font-bold">Cartwise</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </nav>

      {/* Trial Banner */}
      {subscription?.status === "trial" && trialDaysRemaining > 0 && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <p className="text-sm text-center">
              <strong>Free Trial Active:</strong> You have {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining. 
              Enjoying Cartwise? Your subscription will automatically continue at $5/month.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="recipes" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <TabsList>
              <TabsTrigger value="recipes">
                <BookOpen className="w-4 h-4 mr-2" />
                Recipes
              </TabsTrigger>
              <TabsTrigger value="shopping">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shopping List
                {shoppingList.length > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                    {shoppingList.filter((i) => !i.checked).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <Link href="/recipe/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Recipe
              </Button>
            </Link>
          </div>

          {/* Recipes Tab */}
          <TabsContent value="recipes">
            {recipes.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl font-bold mb-2">
                    No recipes yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Add your first recipe to get started
                  </p>
                  <Link href="/recipe/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Recipe
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                  <Card 
                    key={recipe.id} 
                    variant="interactive"
                    className={`relative ${recipe.is_selected ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardContent className="p-6">
                      {/* Selection checkbox */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleRecipeSelection(recipe.id, recipe.is_selected);
                        }}
                        className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition-colors"
                        title={recipe.is_selected ? "Remove from shopping list" : "Add to shopping list"}
                      >
                        {recipe.is_selected ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>

                      <Link href={`/recipe/${recipe.id}`}>
                        {recipe.category && (
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                            {recipe.category}
                          </span>
                        )}
                        <h3 className="font-serif text-lg font-bold mt-3 mb-2 pr-8">
                          {recipe.title}
                        </h3>
                        {recipe.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {recipe.prep_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {recipe.prep_time}
                            </span>
                          )}
                          {recipe.servings && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {recipe.servings}
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deleteRecipe(recipe.id);
                        }}
                        className="absolute bottom-4 right-4 p-1 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Shopping List Tab */}
          <TabsContent value="shopping">
            {shoppingList.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl font-bold mb-2">
                    Shopping list is empty
                  </h3>
                  <p className="text-muted-foreground">
                    Select recipes from your recipe book to add ingredients
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={clearCheckedItems}
                    disabled={!shoppingList.some((i) => i.checked)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Clear checked
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearAllItems}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear all
                  </Button>
                </div>

                {/* Grouped by aisle */}
                <div className="space-y-6">
                  {Object.entries(groupedShoppingList).map(([aisle, items]) => (
                    <Card key={aisle}>
                      <CardContent className="p-6">
                        <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full"></span>
                          {aisle}
                        </h3>
                        <ul className="space-y-2">
                          {items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                              onClick={() => toggleShoppingItem(item.id, item.checked)}
                            >
                              {item.checked ? (
                                <CheckSquare className="w-5 h-5 text-primary flex-shrink-0" />
                              ) : (
                                <Square className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                                {item.quantity && `${item.quantity} `}
                                {item.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
