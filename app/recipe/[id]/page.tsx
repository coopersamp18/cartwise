"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent } from "@/components/ui";
import NutritionTable from "@/components/NutritionTable";
import { Recipe, RecipeStep, RecipeIngredient } from "@/lib/types";
import { 
  ChefHat, 
  ArrowLeft, 
  Clock, 
  Users,
  ExternalLink,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  Archive,
  ArchiveRestore
} from "lucide-react";

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const loadRecipe = useCallback(async () => {
    try {
      // Load recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .single();

      if (recipeError) throw recipeError;
      setRecipe(recipeData);

      // Load steps
      const { data: stepsData } = await supabase
        .from("recipe_steps")
        .select("*")
        .eq("recipe_id", id)
        .order("step_number", { ascending: true });

      if (stepsData) setSteps(stepsData);

      // Load ingredients
      const { data: ingredientsData } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", id);

      if (ingredientsData) setIngredients(ingredientsData);
    } catch (error) {
      console.error("Error loading recipe:", error);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [id, supabase, router]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    await supabase.from("recipes").delete().eq("id", id);
    router.push("/dashboard");
  };

  const toggleSelection = async () => {
    if (!recipe) return;

    await supabase
      .from("recipes")
      .update({ is_selected: !recipe.is_selected })
      .eq("id", id);

    if (!recipe.is_selected) {
      // Add ingredients to shopping list
      const { data: { user } } = await supabase.auth.getUser();
      const shoppingItems = ingredients.map((ing) => ({
        user_id: user?.id,
        recipe_id: id,
        ingredient_id: ing.id,
        name: ing.name,
        quantity: ing.quantity,
        aisle_category: ing.aisle_category,
        checked: false,
      }));

      await supabase.from("shopping_list").insert(shoppingItems);
    } else {
      // Remove from shopping list
      await supabase
        .from("shopping_list")
        .delete()
        .eq("recipe_id", id);
    }

    setRecipe({ ...recipe, is_selected: !recipe.is_selected });
  };

  const toggleArchive = async () => {
    if (!recipe) return;

    await supabase
      .from("recipes")
      .update({ is_archived: !recipe.is_archived })
      .eq("id", id);

    setRecipe({ ...recipe, is_archived: !recipe.is_archived });
    
    // Navigate back to dashboard after archiving
    if (!recipe.is_archived) {
      router.push("/dashboard");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  // Group ingredients by aisle
  const groupedIngredients = ingredients.reduce((acc, ing) => {
    const aisle = ing.aisle_category || "Other";
    if (!acc[aisle]) acc[aisle] = [];
    acc[aisle].push(ing);
    return acc;
  }, {} as Record<string, RecipeIngredient[]>);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to recipes
          </Link>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          {recipe.image_url && (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-lg">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-[400px] object-cover"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {recipe.category && (
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {recipe.category}
                </span>
              )}
              <h1 className="font-serif text-4xl font-bold mt-3">{recipe.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={recipe.is_selected ? "primary" : "secondary"}
                onClick={toggleSelection}
              >
                {recipe.is_selected ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    In Shopping List
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Add to List
                  </>
                )}
              </Button>
            </div>
          </div>

          {recipe.description && (
            <p className="text-lg text-muted-foreground mb-4">
              {recipe.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
            {recipe.prep_time && (
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Prep: {recipe.prep_time}
              </span>
            )}
            {recipe.cook_time && (
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Cook: {recipe.cook_time}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Serves: {recipe.servings}
              </span>
            )}
            {recipe.source_url && (
              <a 
                href={recipe.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View Source
              </a>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-serif text-xl font-bold mb-4">Ingredients</h2>
                <div className="space-y-4">
                  {Object.entries(groupedIngredients).map(([aisle, items]) => (
                    <div key={aisle}>
                      <h3 className="text-sm font-medium text-primary mb-2">{aisle}</h3>
                      <ul className="space-y-2">
                        {items.map((ingredient) => (
                          <li key={ingredient.id} className="text-sm">
                            {ingredient.quantity && (
                              <span className="font-medium">{ingredient.quantity} </span>
                            )}
                            {ingredient.unit && (
                              <span>{ingredient.unit} </span>
                            )}
                            {ingredient.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Nutrition Table */}
            {recipe && (
              <NutritionTable
                nutrition={{
                  calories: recipe.calories ?? undefined,
                  protein_g: recipe.protein_g ?? undefined,
                  carbs_g: recipe.carbs_g ?? undefined,
                  fat_g: recipe.fat_g ?? undefined,
                  fiber_g: recipe.fiber_g ?? undefined,
                  sugar_g: recipe.sugar_g ?? undefined,
                  sodium_mg: recipe.sodium_mg ?? undefined,
                  cholesterol_mg: recipe.cholesterol_mg ?? undefined,
                  saturated_fat_g: recipe.saturated_fat_g ?? undefined,
                }}
                servings={recipe.servings}
              />
            )}
          </div>

          {/* Instructions */}
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-serif text-xl font-bold mb-6">Instructions</h2>
                <ol className="space-y-6">
                  {steps.map((step) => (
                    <li key={step.id} className="flex gap-4">
                      <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0">
                        {step.step_number}
                      </div>
                      <p className="flex-1 pt-1">{step.instruction}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-8 border-t border-border">
          <Button variant="ghost" onClick={toggleArchive}>
            {recipe.is_archived ? (
              <>
                <ArchiveRestore className="w-4 h-4 mr-2" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Recipe
          </Button>
          <Link href={`/recipe/${id}/edit`}>
            <Button variant="secondary">
              <Edit className="w-4 h-4 mr-2" />
              Edit Recipe
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
