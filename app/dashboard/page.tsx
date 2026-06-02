"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent, Tooltip } from "@/components/ui";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import RecipeFiltersComponent, { RecipeFilters } from "@/components/RecipeFilters";
import { Recipe, ShoppingListItem, Subscription, Tag, PantryItem } from "@/lib/types";
import { parseTimeToMinutes } from "@/lib/time";
import { toggleRecipeSelectionWithShoppingList } from "@/lib/recipe-selection";
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
  ArchiveRestore,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Package,
  ChevronDown,
  ChevronUp
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
    totalTimeMax: null,
  });
  const [showArchived, setShowArchived] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"recipes" | "shopping">("recipes");
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [showPantry, setShowPantry] = useState(true);
  const [newPantryItem, setNewPantryItem] = useState({ name: "", quantity: "" });
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
      const [recipesResult, tagsResult, shoppingResult, pantryResult] = await Promise.all([
        supabase
          .from("recipes")
          .select(
            `
              *,
              recipe_tags (
                tag:tags (*)
              )
            `
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("tags")
          .select("*")
          .order("category", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("shopping_list")
          .select("*")
          .order("aisle_category", { ascending: true }),
        supabase
          .from("pantry_items")
          .select("*")
          .order("aisle_category", { ascending: true }),
      ]);

      const recipesData = recipesResult.data;
      if (recipesData) {
        const recipesWithTags = recipesData.map((recipe: any) => ({
          ...recipe,
          is_archived: recipe.is_archived ?? false,
          tags: recipe.recipe_tags?.map((rt: any) => rt.tag) || [],
        }));
        setAllRecipes(recipesWithTags);
      }

      if (tagsResult.data) {
        setTags(tagsResult.data);
      }

      if (shoppingResult.data) {
        setShoppingList(shoppingResult.data);
      }

      if (pantryResult.data) {
        setPantryItems(pantryResult.data);
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
    try {
      await toggleRecipeSelectionWithShoppingList({ supabase, recipeId, isSelected });
      await loadData();
    } catch (error) {
      console.error("Error toggling recipe selection:", error);
    }
  };

  const toggleShoppingItem = async (itemName: string, checked: boolean) => {
    // Find all items with this name (case-insensitive) to toggle them all
    const itemsToToggle = shoppingList.filter(
      (item) => item.name.toLowerCase().trim() === itemName.toLowerCase().trim()
    );
    
    const itemIds = itemsToToggle.map((item) => item.id);
    
    await supabase
      .from("shopping_list")
      .update({ checked: !checked })
      .in("id", itemIds);

    setShoppingList((prev) =>
      prev.map((item) =>
        itemIds.includes(item.id) ? { ...item, checked: !checked } : item
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

  // Combine duplicate ingredients in shopping list
  const combineShoppingItems = (items: ShoppingListItem[]): ShoppingListItem[] => {
    const combined = new Map<string, ShoppingListItem>();
    
    // Helper to parse quantity and unit (e.g., "2 cups" -> { num: 2, unit: "cups" })
    const parseQuantity = (qty: string | null) => {
      if (!qty) return { num: 0, unit: "", raw: "" };
      const match = qty.match(/^([\d.\/]+)\s*(.*)$/);
      if (match) {
        // Handle fractions like "1/2"
        let num = 0;
        if (match[1].includes("/")) {
          const [numerator, denominator] = match[1].split("/");
          num = parseFloat(numerator) / parseFloat(denominator);
        } else {
          num = parseFloat(match[1]);
        }
        return { num: isNaN(num) ? 0 : num, unit: match[2].trim().toLowerCase(), raw: qty };
      }
      return { num: 0, unit: "", raw: qty };
    };
    
    for (const item of items) {
      const key = item.name.toLowerCase().trim();
      const existing = combined.get(key);
      
      if (existing) {
        const existingParsed = parseQuantity(existing.quantity);
        const newParsed = parseQuantity(item.quantity);
        
        // Only combine if both have numeric quantities AND same unit (or no unit)
        if (existingParsed.num > 0 && newParsed.num > 0 && existingParsed.unit === newParsed.unit) {
          const totalNum = existingParsed.num + newParsed.num;
          const unit = existingParsed.unit;
          combined.set(key, {
            ...existing,
            quantity: unit ? `${totalNum} ${unit}` : String(totalNum),
            checked: existing.checked && item.checked,
          });
        } else if (existing.quantity && item.quantity) {
          // Different units or can't parse - concatenate
          combined.set(key, {
            ...existing,
            quantity: `${existing.quantity} + ${item.quantity}`,
            checked: existing.checked && item.checked,
          });
        } else {
          // One or both have no quantity
          const qty = existing.quantity || item.quantity || null;
          combined.set(key, {
            ...existing,
            quantity: qty,
            checked: existing.checked && item.checked,
          });
        }
      } else {
        combined.set(key, { ...item });
      }
    }
    
    return Array.from(combined.values());
  };

  const groupedShoppingList = AISLE_ORDER.reduce((acc, aisle) => {
    const items = shoppingList.filter((item) => item.aisle_category === aisle);
    if (items.length > 0) {
      acc[aisle] = combineShoppingItems(items);
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

  const addPantryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPantryItem.name.trim()) return;

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { data, error } = await supabase.from("pantry_items").insert({
      user_id: currentUser.id,
      name: newPantryItem.name.trim(),
      quantity: newPantryItem.quantity.trim() || null,
      aisle_category: "Other",
    }).select();

    if (error) {
      console.error("Error adding pantry item:", error);
      alert(`Failed to add pantry item: ${error.message}`);
    } else {
      console.log("Pantry item added:", data);
      setNewPantryItem({ name: "", quantity: "" });
      loadData();
    }
  };

  const deletePantryItem = async (itemId: string) => {
    const { error } = await supabase
      .from("pantry_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error deleting pantry item:", error);
    } else {
      setPantryItems((prev) => prev.filter((item) => item.id !== itemId));
    }
  };

  const clearAllPantryItems = async () => {
    if (!confirm("Are you sure you want to clear all pantry items?")) return;
    
    const { error } = await supabase
      .from("pantry_items")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      console.error("Error clearing pantry:", error);
    } else {
      setPantryItems([]);
    }
  };

  // Group pantry items by aisle
  const groupedPantryItems = AISLE_ORDER.reduce((acc, aisle) => {
    const items = pantryItems.filter((item) => item.aisle_category === aisle);
    if (items.length > 0) {
      acc[aisle] = items;
    }
    return acc;
  }, {} as Record<string, PantryItem[]>);

  // Create a Set of pantry item names for quick lookup (case-insensitive)
  const pantryItemNames = new Set(
    pantryItems.map((item) => item.name.toLowerCase().trim())
  );

  // Check if a shopping item is in the pantry
  const isInPantry = (itemName: string) => {
    return pantryItemNames.has(itemName.toLowerCase().trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="flex-shrink-0 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <span className="font-serif text-xl font-bold">Cartwise</span>
          </Link>
        </div>
      </nav>

      {/* Trial Banner */}
      {subscription?.status === "trial" && trialDaysRemaining > 0 && showTrialBanner && (
        <div className="flex-shrink-0 bg-primary/10 border-b border-primary/20">
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
      <main className="flex flex-1 min-h-0 h-full">
        {/* Filters Sidebar */}
        <RecipeFiltersComponent
          tags={tags}
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(!filtersOpen)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showFavorites={showFavorites}
          onToggleFavorites={() => setShowFavorites(!showFavorites)}
          showArchived={showArchived}
          onToggleArchived={() => {
            console.log('Toggling showArchived from', showArchived, 'to', !showArchived);
            setShowArchived(!showArchived);
          }}
          shoppingListCount={shoppingList.filter((i) => !i.checked).length}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            {/* Recipes Tab */}
            {activeTab === "recipes" && (
              <>
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
                    className={`relative flex flex-col h-full overflow-hidden ${recipe.is_selected ? "ring-2 ring-primary" : ""}`}
                  >
                    {/* Recipe Image */}
                    {recipe.image_url && (
                      <Link 
                        href={`/recipe/${recipe.id}`} 
                        className="block w-full aspect-[4/3] overflow-hidden bg-muted"
                      >
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                          style={{ display: 'block', margin: 0, padding: 0, lineHeight: 0 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </Link>
                    )}
                    
                    <CardContent className="p-6 relative flex flex-col flex-1 gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {recipe.category && (
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full leading-none">
                              {recipe.category}
                            </span>
                          )}
                          {recipe.tags && recipe.tags.length > 0 && (
                            <>
                              {recipe.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full leading-none"
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {recipe.tags.length > 2 && (
                                <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full leading-none">
                                  +{recipe.tags.length - 2}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 -mr-2">
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
                      </div>

                      <Link href={`/recipe/${recipe.id}`} className="flex-1 flex flex-col gap-3 min-h-0">
                        <div className="flex-1 flex flex-col gap-3">
                          <h3 className="font-serif text-lg font-bold">
                            {recipe.title}
                          </h3>
                          {recipe.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {recipe.description}
                            </p>
                          )}
                        </div>

                        {/* Bottom Section - Macros, Time, Servings */}
                        <div className="mt-auto space-y-3">
                          {/* Macros Section */}
                          {(recipe.calories !== null || recipe.protein_g !== null || recipe.carbs_g !== null || recipe.fat_g !== null) && (
                            <div className="flex items-center justify-around gap-2 py-2.5 border-y border-border">
                              {recipe.calories !== null && (
                                <div className="flex flex-col items-center gap-1 flex-1">
                                  <Flame className="w-4 h-4 text-orange-500" />
                                  <span className="text-xs font-semibold text-foreground">
                                    {Math.round(recipe.calories)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground leading-none">cal</span>
                                </div>
                              )}
                              {recipe.protein_g !== null && (
                                <div className="flex flex-col items-center gap-1 flex-1">
                                  <Beef className="w-4 h-4 text-red-500" />
                                  <span className="text-xs font-semibold text-foreground">
                                    {Math.round(recipe.protein_g)}g
                                  </span>
                                  <span className="text-[10px] text-muted-foreground leading-none">protein</span>
                                </div>
                              )}
                              {recipe.carbs_g !== null && (
                                <div className="flex flex-col items-center gap-1 flex-1">
                                  <Wheat className="w-4 h-4 text-amber-500" />
                                  <span className="text-xs font-semibold text-foreground">
                                    {Math.round(recipe.carbs_g)}g
                                  </span>
                                  <span className="text-[10px] text-muted-foreground leading-none">carbs</span>
                                </div>
                              )}
                              {recipe.fat_g !== null && (
                                <div className="flex flex-col items-center gap-1 flex-1">
                                  <Droplet className="w-4 h-4 text-blue-500" />
                                  <span className="text-xs font-semibold text-foreground">
                                    {Math.round(recipe.fat_g)}g
                                  </span>
                                  <span className="text-[10px] text-muted-foreground leading-none">fat</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
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
                            {/* Archive/Delete button */}
                            {showArchived ? (
                            <Tooltip content="Delete recipe">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteRecipe(recipe.id);
                                }}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          ) : (
                            <Tooltip content={recipe.is_archived ? "Unarchive recipe" : "Archive recipe"}>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
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
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
              </>
            )}

            {/* Shopping List Tab */}
            {activeTab === "shopping" && (
              <div className="space-y-8">
                {/* Shopping List Section */}
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
                          {items.map((item) => {
                            const inPantry = isInPantry(item.name);
                            const isCrossedOut = item.checked || inPantry;
                            return (
                              <li
                                key={item.id}
                                className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                                onClick={() => toggleShoppingItem(item.name, item.checked)}
                              >
                                {item.checked ? (
                                  <CheckSquare className="w-5 h-5 text-primary flex-shrink-0" />
                                ) : inPantry ? (
                                  <Package className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                ) : (
                                  <Square className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className={isCrossedOut ? "line-through text-muted-foreground" : ""}>
                                  {item.quantity && `${item.quantity} `}
                                  {item.name}
                                </span>
                                {inPantry && !item.checked && (
                                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-auto">
                                    in pantry
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pantry Section */}
                <div className="border-t border-border pt-8">
                  <button
                    onClick={() => setShowPantry(!showPantry)}
                    className="w-full flex items-center justify-between mb-6 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <h2 className="font-serif text-xl font-bold">My Pantry</h2>
                        <p className="text-sm text-muted-foreground">
                          {pantryItems.length} item{pantryItems.length !== 1 ? "s" : ""} in stock
                        </p>
                      </div>
                    </div>
                    {showPantry ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </button>

                  {showPantry && (
                    <div className="space-y-6">
                      {/* Add Pantry Item Form */}
                      <Card>
                        <CardContent className="p-4">
                          <form onSubmit={addPantryItem} className="flex gap-3">
                            <input
                              type="text"
                              placeholder="Item name (e.g., Olive oil)"
                              value={newPantryItem.name}
                              onChange={(e) => setNewPantryItem({ ...newPantryItem, name: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newPantryItem.name.trim()) {
                                  e.preventDefault();
                                  addPantryItem(e as unknown as React.FormEvent);
                                }
                              }}
                              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <input
                              type="text"
                              placeholder="Qty (optional)"
                              value={newPantryItem.quantity}
                              onChange={(e) => setNewPantryItem({ ...newPantryItem, quantity: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newPantryItem.name.trim()) {
                                  e.preventDefault();
                                  addPantryItem(e as unknown as React.FormEvent);
                                }
                              }}
                              className="w-32 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <Button type="submit" disabled={!newPantryItem.name.trim()}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      {/* Pantry Items List */}
                      {pantryItems.length === 0 ? (
                        <Card>
                          <CardContent className="py-12 text-center">
                            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <h3 className="font-medium mb-1">Your pantry is empty</h3>
                            <p className="text-sm text-muted-foreground">
                              Add items you already have at home
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          {/* Clear All Button */}
                          <div className="flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={clearAllPantryItems}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Clear pantry
                            </Button>
                          </div>

                          {/* Grouped by aisle */}
                          <div className="space-y-4">
                            {Object.entries(groupedPantryItems).map(([aisle, items]) => (
                              <Card key={aisle}>
                                <CardContent className="p-4">
                                  <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    {aisle}
                                  </h3>
                                  <ul className="space-y-1">
                                    {items.map((item) => (
                                      <li
                                        key={item.id}
                                        className="flex items-center justify-between gap-3 p-2 hover:bg-muted rounded-lg transition-colors group"
                                      >
                                        <span className="text-sm">
                                          {item.quantity && (
                                            <span className="text-muted-foreground">{item.quantity} </span>
                                          )}
                                          {item.name}
                                        </span>
                                        <button
                                          onClick={() => deletePantryItem(item.id)}
                                          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                                          title="Remove from pantry"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
