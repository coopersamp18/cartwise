"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Tooltip } from "@/components/ui";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import RecipeFiltersComponent, { RecipeFilters } from "@/components/RecipeFilters";
import { Recipe, ShoppingListItem, Subscription, Tag } from "@/lib/types";
import { 
  ChefHat, 
  Plus, 
  BookOpen, 
  ShoppingCart, 
  Clock, 
  Users,
  Check,
  Trash2,
  Square,
  CheckSquare,
  X,
  Star,
  Archive,
  ArchiveRestore
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
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]); // Unfiltered recipes
  const [tags, setTags] = useState<Tag[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);
  const [showTrialBanner, setShowTrialBanner] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>({
    category: null,
    tags: [],
    prepTimeMax: null,
    cookTimeMax: null,
    totalTimeMax: null,
  });
  const [showArchived, setShowArchived] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Check sessionStorage on mount to see if banner was dismissed this session
  useEffect(() => {
    const bannerDismissed = sessionStorage.getItem('trialBannerDismissed');
    if (!bannerDismissed) {
      setShowTrialBanner(true);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      // Load recipes with tags
      const { data: recipesData } = await supabase
        .from("recipes")
        .select(`
          *,
          recipe_tags (
            tag:tags (*)
          )
        `)
        .order("created_at", { ascending: false });

      if (recipesData) {
        // Transform recipes to include tags array
        const recipesWithTags = recipesData.map((recipe: any) => ({
          ...recipe,
          is_archived: recipe.is_archived ?? false, // Ensure boolean, default to false
          tags: recipe.recipe_tags?.map((rt: any) => rt.tag) || [],
        }));
        setAllRecipes(recipesWithTags);
      }

      // Load tags
      const { data: tagsData } = await supabase
        .from("tags")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (tagsData) {
        setTags(tagsData);
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

  // Apply filters to recipes
  useEffect(() => {
    let filtered = [...allRecipes];

    // Filter by archived status
    // Treat null/undefined/false as not archived, only true values as archived
    const isRecipeArchived = (recipe: Recipe) => {
      // is_archived is typed as boolean, so we only need to check for true
      return recipe.is_archived === true;
    };
    
    // Debug: Log all recipe archived statuses
    if (process.env.NODE_ENV === 'development') {
      console.log('All recipes archived status:', allRecipes.map(r => ({
        title: r.title,
        is_archived: r.is_archived,
        type: typeof r.is_archived,
        isTrue: r.is_archived === true
      })));
    }
    
    if (!showArchived) {
      // Show only non-archived recipes
      filtered = filtered.filter((recipe) => !isRecipeArchived(recipe));
    } else {
      // Show only archived recipes
      filtered = filtered.filter((recipe) => isRecipeArchived(recipe));
    }
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Filtering recipes:', {
        showArchived,
        totalRecipes: allRecipes.length,
        archivedCount: allRecipes.filter(r => r.is_archived === true).length,
        filteredCount: filtered.length,
        filteredTitles: filtered.map(r => r.title)
      });
    }

    // Filter by favorites
    if (showFavorites) {
      filtered = filtered.filter((recipe) => recipe.is_favorited);
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter((recipe) => recipe.category === filters.category);
    }

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter((recipe) => {
        const recipeTagIds = recipe.tags?.map((tag) => tag.id) || [];
        return filters.tags.some((tagId) => recipeTagIds.includes(tagId));
      });
    }

    // Filter by prep time
    if (filters.prepTimeMax) {
      filtered = filtered.filter((recipe) => {
        const prepTime = recipe.prep_time_minutes || parseTimeToMinutes(recipe.prep_time);
        return prepTime !== null && prepTime <= filters.prepTimeMax!;
      });
    }

    // Filter by cook time
    if (filters.cookTimeMax) {
      filtered = filtered.filter((recipe) => {
        const cookTime = recipe.cook_time_minutes || parseTimeToMinutes(recipe.cook_time);
        return cookTime !== null && cookTime <= filters.cookTimeMax!;
      });
    }

    // Filter by total time
    if (filters.totalTimeMax) {
      filtered = filtered.filter((recipe) => {
        const prepTime = recipe.prep_time_minutes || parseTimeToMinutes(recipe.prep_time) || 0;
        const cookTime = recipe.cook_time_minutes || parseTimeToMinutes(recipe.cook_time) || 0;
        const totalTime = prepTime + cookTime;
        return totalTime > 0 && totalTime <= filters.totalTimeMax!;
      });
    }

    setRecipes(filtered);
  }, [allRecipes, filters, showArchived, showFavorites]);

  // Helper function to parse time strings to minutes
  const parseTimeToMinutes = (timeStr: string | null): number | null => {
    if (!timeStr) return null;
    // Try to parse formats like "30 min", "1 hour", "1h 30m", etc.
    const hourMatch = timeStr.match(/(\d+)\s*h/i);
    const minMatch = timeStr.match(/(\d+)\s*m/i);
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minMatch ? parseInt(minMatch[1]) : 0;
    const total = hours * 60 + minutes;
    return total > 0 ? total : null;
  };

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

  const toggleFavorite = async (recipeId: string, isFavorited: boolean) => {
    await supabase
      .from("recipes")
      .update({ is_favorited: !isFavorited })
      .eq("id", recipeId);
    loadData();
  };

  const toggleArchive = async (recipeId: string, isArchived: boolean) => {
    const newArchivedStatus = !isArchived;
    const { error } = await supabase
      .from("recipes")
      .update({ is_archived: newArchivedStatus })
      .eq("id", recipeId);
    
    if (error) {
      console.error("Error toggling archive:", error);
      alert(`Failed to ${newArchivedStatus ? "archive" : "unarchive"} recipe: ${error.message}`);
    } else {
      loadData();
    }
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
          <ProfileDropdown />
        </div>
      </nav>

      {/* Trial Banner */}
      {subscription?.status === "trial" && trialDaysRemaining > 0 && showTrialBanner && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-6xl mx-auto px-6 py-3 relative">
            <p className="text-sm text-center pr-8">
              <strong>Free Trial Active:</strong> You have {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining. 
              Enjoying Cartwise? Your subscription will automatically continue at $5/month.
            </p>
            <button
              onClick={() => {
                setShowTrialBanner(false);
                sessionStorage.setItem('trialBannerDismissed', 'true');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-primary/20 rounded-lg transition-colors"
              title="Close banner"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
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
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <RecipeFiltersComponent
                    tags={tags}
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant={showFavorites ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setShowFavorites(!showFavorites)}
                  >
                    <Star className={`w-4 h-4 mr-2 ${showFavorites ? "fill-current" : ""}`} />
                    {showFavorites ? "All Recipes" : "Favorites"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      console.log('Toggling showArchived from', showArchived, 'to', !showArchived);
                      setShowArchived(!showArchived);
                    }}
                  >
                    {showArchived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4 mr-2" />
                        Show Active
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 mr-2" />
                        Show Archived
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            {recipes.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl font-bold mb-2">
                    {showArchived ? "No archived recipes" : "No recipes yet"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {showArchived 
                      ? "You don&apos;t have any archived recipes" 
                      : "Add your first recipe to get started"}
                  </p>
                  {!showArchived && (
                    <Link href="/recipe/new">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Recipe
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {recipes.map((recipe) => (
                  <Card 
                    key={recipe.id} 
                    variant="interactive"
                    className={`relative flex flex-col ${recipe.is_selected ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardContent className="p-0 relative flex flex-col flex-1">
                      {/* Recipe Image */}
                      {recipe.image_url && (
                        <Link href={`/recipe/${recipe.id}`}>
                          <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
                            <img
                              src={recipe.image_url}
                              alt={recipe.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        </Link>
                      )}
                      
                      <div className="p-6 flex flex-col flex-1 min-h-0">
                        {/* Action buttons - below image, aligned to the right */}
                        <div className="flex items-center justify-end gap-2 mb-4">
                          <Tooltip 
                            content={recipe.is_favorited ? "Remove from favorites" : "Add to favorites"}
                            position="top"
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(recipe.id, recipe.is_favorited || false);
                              }}
                              className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  recipe.is_favorited
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          </Tooltip>
                          <Tooltip 
                            content={recipe.is_selected ? "Remove from shopping list" : "Add to shopping list"}
                            position="top"
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleRecipeSelection(recipe.id, recipe.is_selected);
                              }}
                              className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                              <ShoppingCart
                                className={`w-5 h-5 ${
                                  recipe.is_selected
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          </Tooltip>
                        </div>

                        <Link href={`/recipe/${recipe.id}`} className="flex-1 flex flex-col">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {recipe.category && (
                              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                                {recipe.category}
                              </span>
                            )}
                            {recipe.tags && recipe.tags.length > 0 && (
                              <>
                                {recipe.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {recipe.tags.length > 2 && (
                                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                    +{recipe.tags.length - 2}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <h3 className="font-serif text-lg font-bold mb-2">
                            {recipe.title}
                          </h3>
                          {recipe.description ? (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                              {recipe.description}
                            </p>
                          ) : (
                            <div className="flex-1"></div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto">
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
                      </div>

                      {/* Archive/Delete button - bottom right of card */}
                      <div className="absolute bottom-6 right-6 z-10">
                        {showArchived ? (
                          // Show delete button when viewing archived recipes
                          <Tooltip content="Delete recipe">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                deleteRecipe(recipe.id);
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        ) : (
                          // Show archive button when viewing active recipes
                          <Tooltip content={recipe.is_archived ? "Unarchive recipe" : "Archive recipe"}>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleArchive(recipe.id, recipe.is_archived || false);
                              }}
                              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                            >
                              {recipe.is_archived ? (
                                <ArchiveRestore className="w-4 h-4" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )}
                            </button>
                          </Tooltip>
                        )}
                      </div>
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
