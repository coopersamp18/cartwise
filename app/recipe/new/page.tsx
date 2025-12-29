"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardContent } from "@/components/ui";
import TagSelector from "@/components/TagSelector";
import { ParsedRecipe } from "@/lib/openai";
import { Tag } from "@/lib/types";
import { 
  ChefHat, 
  ArrowLeft, 
  Link as LinkIcon, 
  FileText, 
  Sparkles,
  Save,
  Plus,
  Trash2
} from "lucide-react";

type InputMode = "url" | "text";

export default function NewRecipePage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [recipeText, setRecipeText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  const router = useRouter();
  const supabase = createClient();

  // Load tags on mount
  useEffect(() => {
    const loadTags = async () => {
      const { data } = await supabase
        .from("tags")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (data) setTags(data);
    };
    loadTags();
  }, [supabase]);

  const handleExtract = async () => {
    setError("");
    setIsExtracting(true);

    try {
      const response = await fetch("/api/extract-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          url: mode === "url" ? url : undefined,
          text: mode === "text" ? recipeText : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to extract recipe");
      }

      const recipe = await response.json();
      setParsedRecipe(recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract recipe");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!parsedRecipe) return;

    setIsSaving(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Parse time strings to minutes
      const parseTimeToMinutes = (timeStr: string | null): number | null => {
        if (!timeStr) return null;
        const hourMatch = timeStr.match(/(\d+)\s*h/i);
        const minMatch = timeStr.match(/(\d+)\s*m/i);
        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minMatch ? parseInt(minMatch[1]) : 0;
        const total = hours * 60 + minutes;
        return total > 0 ? total : null;
      };

      // Build base recipe data (always works)
      const baseRecipeData = {
        user_id: user.id,
        title: parsedRecipe.title,
        description: parsedRecipe.description,
        category: parsedRecipe.category,
        source_url: mode === "url" ? url : null,
        image_url: parsedRecipe.imageUrl || null,
        servings: parsedRecipe.servings,
        prep_time: parsedRecipe.prepTime,
        cook_time: parsedRecipe.cookTime,
      };

      // Try to insert with new fields first (if migration has been run)
      const prepMinutes = parseTimeToMinutes(parsedRecipe.prepTime);
      const cookMinutes = parseTimeToMinutes(parsedRecipe.cookTime);
      
      let recipe;
      let recipeError;
      
      // First attempt: try with new fields
      const recipeDataWithNewFields = {
        ...baseRecipeData,
        ...(prepMinutes !== null && { prep_time_minutes: prepMinutes }),
        ...(cookMinutes !== null && { cook_time_minutes: cookMinutes }),
      };

      const result = await supabase
        .from("recipes")
        .insert(recipeDataWithNewFields)
        .select()
        .single();

      recipe = result.data;
      recipeError = result.error;

      // If that failed, try without new fields (migration not run yet)
      if (recipeError && recipeError.message?.includes("column") && recipeError.message?.includes("does not exist")) {
        console.warn("New columns don't exist, saving without them. Run the migration to enable tags and filters.");
        const fallbackResult = await supabase
          .from("recipes")
          .insert(baseRecipeData)
          .select()
          .single();
        
        recipe = fallbackResult.data;
        recipeError = fallbackResult.error;
      }

      if (recipeError || !recipe) {
        console.error("Recipe insert error:", recipeError);
        throw new Error(`Failed to save recipe: ${recipeError?.message || "Unknown error"}`);
      }

      // Insert tags (only if recipe_tags table exists)
      if (selectedTagIds.length > 0) {
        try {
          const { error: tagsError } = await supabase
            .from("recipe_tags")
            .insert(
              selectedTagIds.map((tagId) => ({
                recipe_id: recipe.id,
                tag_id: tagId,
              }))
            );
          if (tagsError) {
            console.error("Tags insert error:", tagsError);
            // Don't fail the whole save if tags fail - just log it
            console.warn("Failed to save tags, but recipe was saved successfully");
          }
        } catch (tagsErr) {
          console.warn("Tags table may not exist yet. Recipe saved without tags.");
        }
      }

      // Insert steps
      if (parsedRecipe.steps.length > 0) {
        const { error: stepsError } = await supabase.from("recipe_steps").insert(
          parsedRecipe.steps.map((step) => ({
            recipe_id: recipe.id,
            step_number: step.stepNumber,
            instruction: step.instruction,
          }))
        );
        if (stepsError) throw stepsError;
      }

      // Insert ingredients
      if (parsedRecipe.ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from("recipe_ingredients")
          .insert(
            parsedRecipe.ingredients.map((ing) => ({
              recipe_id: recipe.id,
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              aisle_category: ing.aisleCategory,
            }))
          );
        if (ingredientsError) throw ingredientsError;
      }

      router.push(`/recipe/${recipe.id}`);
    } catch (err) {
      console.error("Save recipe error:", err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null && 'message' in err
        ? String(err.message)
        : "Failed to save recipe. Please check the browser console for details.";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    if (!parsedRecipe) return;
    const newIngredients = [...parsedRecipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setParsedRecipe({ ...parsedRecipe, ingredients: newIngredients });
  };

  const removeIngredient = (index: number) => {
    if (!parsedRecipe) return;
    const newIngredients = parsedRecipe.ingredients.filter((_, i) => i !== index);
    setParsedRecipe({ ...parsedRecipe, ingredients: newIngredients });
  };

  const addIngredient = () => {
    if (!parsedRecipe) return;
    setParsedRecipe({
      ...parsedRecipe,
      ingredients: [
        ...parsedRecipe.ingredients,
        { name: "", quantity: "", unit: "", aisleCategory: "Other" },
      ],
    });
  };

  const updateStep = (index: number, instruction: string) => {
    if (!parsedRecipe) return;
    const newSteps = [...parsedRecipe.steps];
    newSteps[index] = { ...newSteps[index], instruction };
    setParsedRecipe({ ...parsedRecipe, steps: newSteps });
  };

  const removeStep = (index: number) => {
    if (!parsedRecipe) return;
    const newSteps = parsedRecipe.steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, stepNumber: i + 1 }));
    setParsedRecipe({ ...parsedRecipe, steps: newSteps });
  };

  const addStep = () => {
    if (!parsedRecipe) return;
    setParsedRecipe({
      ...parsedRecipe,
      steps: [
        ...parsedRecipe.steps,
        { stepNumber: parsedRecipe.steps.length + 1, instruction: "" },
      ],
    });
  };

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
            <span className="font-serif font-bold">New Recipe</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {!parsedRecipe ? (
          // Input Mode Selection
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold mb-2">Add a new recipe</h1>
              <p className="text-muted-foreground">
                Paste a URL or enter recipe text and we&apos;ll extract the details
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-xl">
                <button
                  onClick={() => setMode("url")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${mode === "url" 
                      ? "bg-white text-foreground shadow-soft" 
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  From URL
                </button>
                <button
                  onClick={() => setMode("text")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${mode === "text" 
                      ? "bg-white text-foreground shadow-soft" 
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Paste Text
                </button>
              </div>
            </div>

            {/* Input Area */}
            <Card>
              <CardContent className="p-8">
                {mode === "url" ? (
                  <div className="space-y-4">
                    <Input
                      id="url"
                      type="url"
                      label="Recipe URL"
                      placeholder="https://example.com/recipe/..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Paste a link to any recipe page and we&apos;ll extract the ingredients and instructions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Recipe Text
                      </label>
                      <textarea
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white
                          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                          transition-all duration-200 min-h-[300px] resize-y"
                        placeholder="Paste your recipe here... Include the title, ingredients, and instructions."
                        value={recipeText}
                        onChange={(e) => setRecipeText(e.target.value)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Copy and paste recipe text from anywhere. Our AI will parse it for you.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  className="w-full mt-6"
                  onClick={handleExtract}
                  disabled={isExtracting || (mode === "url" ? !url : !recipeText)}
                  isLoading={isExtracting}
                >
                  {!isExtracting && <Sparkles className="w-4 h-4 mr-2" />}
                  {isExtracting ? "Extracting recipe..." : "Extract Recipe"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Parsed Recipe Editor
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif text-3xl font-bold mb-2">Review & Edit</h1>
                <p className="text-muted-foreground">
                  Make any changes before saving
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="secondary" 
                  onClick={() => setParsedRecipe(null)}
                >
                  Start Over
                </Button>
                <Button onClick={handleSave} isLoading={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Recipe
                </Button>
              </div>
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
                  value={parsedRecipe.title}
                  onChange={(e) => setParsedRecipe({ ...parsedRecipe, title: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                      transition-all duration-200 min-h-[80px] resize-y"
                    value={parsedRecipe.description}
                    onChange={(e) => setParsedRecipe({ ...parsedRecipe, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Category <span className="text-xs text-muted-foreground">(auto-detected)</span>
                    </label>
                    <Input
                      id="category"
                      value={parsedRecipe.category || ""}
                      onChange={(e) => setParsedRecipe({ ...parsedRecipe, category: e.target.value })}
                      placeholder="Auto-populated from recipe"
                    />
                  </div>
                  <Input
                    id="servings"
                    label="Servings"
                    value={parsedRecipe.servings || ""}
                    onChange={(e) => setParsedRecipe({ ...parsedRecipe, servings: e.target.value })}
                  />
                  <Input
                    id="prepTime"
                    label="Prep Time"
                    value={parsedRecipe.prepTime || ""}
                    onChange={(e) => setParsedRecipe({ ...parsedRecipe, prepTime: e.target.value })}
                    placeholder="e.g., 30 min"
                  />
                  <Input
                    id="cookTime"
                    label="Cook Time"
                    value={parsedRecipe.cookTime || ""}
                    onChange={(e) => setParsedRecipe({ ...parsedRecipe, cookTime: e.target.value })}
                    placeholder="e.g., 1 hour"
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
                  {parsedRecipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <Input
                          placeholder="Qty"
                          value={ingredient.quantity}
                          onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                        />
                        <Input
                          placeholder="Unit"
                          value={ingredient.unit}
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
                        value={ingredient.aisleCategory}
                        onChange={(e) => updateIngredient(index, "aisleCategory", e.target.value)}
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
                  {parsedRecipe.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0 mt-2">
                        {step.stepNumber}
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
              <Button 
                variant="secondary" 
                onClick={() => setParsedRecipe(null)}
              >
                Start Over
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Save Recipe
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
