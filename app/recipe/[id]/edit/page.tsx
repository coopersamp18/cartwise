"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardContent } from "@/components/ui";
import TagSelector from "@/components/TagSelector";
import { Recipe, RecipeStep, RecipeIngredient, Tag } from "@/lib/types";
import { parseTimeToMinutes } from "@/lib/time";
import { 
  ChefHat, 
  ArrowLeft, 
  Save,
  Plus,
  Trash2
} from "lucide-react";

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const loadRecipe = useCallback(async () => {
    try {
      // Load recipe with tags
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select(`
          *,
          recipe_tags (
            tag:tags (*)
          )
        `)
        .eq("id", id)
        .single();

      if (recipeError) throw recipeError;
      
      // Transform to include tags array
      const recipeWithTags = {
        ...recipeData,
        tags: recipeData.recipe_tags?.map((rt: any) => rt.tag) || [],
      };
      setRecipe(recipeWithTags);
      setSelectedTagIds(recipeWithTags.tags?.map((tag: Tag) => tag.id) || []);

      // Load all available tags
      const { data: allTags } = await supabase
        .from("tags")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (allTags) setTags(allTags);

      const { data: stepsData } = await supabase
        .from("recipe_steps")
        .select("*")
        .eq("recipe_id", id)
        .order("step_number", { ascending: true });

      if (stepsData) setSteps(stepsData);

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

  const handleSave = async () => {
    if (!recipe) return;

    setIsSaving(true);
    setError("");

    try {
      // Update recipe
      const { error: recipeError } = await supabase
        .from("recipes")
        .update({
          title: recipe.title,
          description: recipe.description,
          category: recipe.category,
          image_url: recipe.image_url,
          servings: recipe.servings,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          prep_time_minutes: parseTimeToMinutes(recipe.prep_time),
          cook_time_minutes: parseTimeToMinutes(recipe.cook_time),
        })
        .eq("id", id);

      if (recipeError) throw recipeError;

      // Update tags
      // Delete existing tags
      await supabase.from("recipe_tags").delete().eq("recipe_id", id);
      // Insert new tags
      if (selectedTagIds.length > 0) {
        const { error: tagsError } = await supabase
          .from("recipe_tags")
          .insert(
            selectedTagIds.map((tagId) => ({
              recipe_id: id,
              tag_id: tagId,
            }))
          );
        if (tagsError) throw tagsError;
      }

      // Delete existing steps and ingredients
      await supabase.from("recipe_steps").delete().eq("recipe_id", id);
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);

      // Re-insert steps
      if (steps.length > 0) {
        const { error: stepsError } = await supabase.from("recipe_steps").insert(
          steps.map((step, index) => ({
            recipe_id: id,
            step_number: index + 1,
            instruction: step.instruction,
          }))
        );
        if (stepsError) throw stepsError;
      }

      // Re-insert ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from("recipe_ingredients")
          .insert(
            ingredients.map((ing) => ({
              recipe_id: id,
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              aisle_category: ing.aisle_category,
            }))
          );
        if (ingredientsError) throw ingredientsError;
      }

      router.push(`/recipe/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe");
    } finally {
      setIsSaving(false);
    }
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { 
        id: `new-${Date.now()}`, 
        recipe_id: id, 
        name: "", 
        quantity: "", 
        unit: "", 
        aisle_category: "Other" 
      },
    ]);
  };

  const updateStep = (index: number, instruction: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], instruction };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(
      steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, step_number: i + 1 }))
    );
  };

  const addStep = () => {
    setSteps([
      ...steps,
      { 
        id: `new-${Date.now()}`, 
        recipe_id: id, 
        step_number: steps.length + 1, 
        instruction: "" 
      },
    ]);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            href={`/recipe/${id}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to recipe
          </Link>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            <span className="font-serif font-bold">Edit Recipe</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold mb-2">Edit Recipe</h1>
              <p className="text-muted-foreground">
                Make changes to your recipe
              </p>
            </div>
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <Input
                id="title"
                label="Title"
                value={recipe.title}
                onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                    transition-all duration-200 min-h-[80px] resize-y"
                  value={recipe.description || ""}
                  onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Cover Image URL
                </label>
                <Input
                  id="image_url"
                  placeholder="https://example.com/recipe-image.jpg"
                  value={recipe.image_url || ""}
                  onChange={(e) => setRecipe({ ...recipe, image_url: e.target.value })}
                />
                {recipe.image_url && (
                  <div className="mt-3 rounded-xl overflow-hidden">
                    <img
                      src={recipe.image_url}
                      alt="Recipe preview"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Input
                  id="category"
                  label="Category"
                  value={recipe.category || ""}
                  onChange={(e) => setRecipe({ ...recipe, category: e.target.value })}
                  placeholder="e.g., Dinner, Breakfast, Lunch"
                />
                <Input
                  id="servings"
                  label="Servings"
                  value={recipe.servings || ""}
                  onChange={(e) => setRecipe({ ...recipe, servings: e.target.value })}
                />
                <Input
                  id="prep_time"
                  label="Prep Time"
                  value={recipe.prep_time || ""}
                  onChange={(e) => setRecipe({ ...recipe, prep_time: e.target.value })}
                />
                <Input
                  id="cook_time"
                  label="Cook Time"
                  value={recipe.cook_time || ""}
                  onChange={(e) => setRecipe({ ...recipe, cook_time: e.target.value })}
                />
              </div>

              {/* Tags */}
              <TagSelector
                availableTags={tags}
                selectedTagIds={selectedTagIds}
                onSelectionChange={setSelectedTagIds}
              />
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold">Ingredients</h2>
                <Button variant="ghost" size="sm" onClick={addIngredient}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div key={ingredient.id} className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <Input
                        placeholder="Qty"
                        value={ingredient.quantity || ""}
                        onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                      />
                      <Input
                        placeholder="Unit"
                        value={ingredient.unit || ""}
                        onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                      />
                      <Input
                        placeholder="Ingredient"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, "name", e.target.value)}
                        className="col-span-2"
                      />
                    </div>
                    <select
                      className="px-3 py-3 rounded-xl border border-border bg-white text-sm"
                      value={ingredient.aisle_category}
                      onChange={(e) => updateIngredient(index, "aisle_category", e.target.value)}
                    >
                      <option value="Produce">Produce</option>
                      <option value="Dairy">Dairy</option>
                      <option value="Meat & Seafood">Meat & Seafood</option>
                      <option value="Bakery">Bakery</option>
                      <option value="Frozen">Frozen</option>
                      <option value="Pantry">Pantry</option>
                      <option value="Canned Goods">Canned Goods</option>
                      <option value="Condiments">Condiments</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Snacks">Snacks</option>
                      <option value="Spices">Spices</option>
                      <option value="Deli">Deli</option>
                      <option value="Other">Other</option>
                    </select>
                    <button
                      onClick={() => removeIngredient(index)}
                      className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold">Instructions</h2>
                <Button variant="ghost" size="sm" onClick={addStep}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0 mt-2">
                      {index + 1}
                    </div>
                    <textarea
                      className="flex-1 px-4 py-3 rounded-xl border border-border bg-white
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        transition-all duration-200 min-h-[80px] resize-y"
                      value={step.instruction}
                      onChange={(e) => updateStep(index, e.target.value)}
                    />
                    <button
                      onClick={() => removeStep(index)}
                      className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-500 transition-colors mt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save Button (bottom) */}
          <div className="flex justify-end gap-3">
            <Link href={`/recipe/${id}`}>
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
