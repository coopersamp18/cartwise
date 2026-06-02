import { SupabaseClient } from "@supabase/supabase-js";

type ShoppingListIngredient = {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  aisle_category: string | null;
};

type ToggleSelectionParams = {
  supabase: SupabaseClient<any, any, any>;
  recipeId: string;
  isSelected: boolean;
  ingredients?: ShoppingListIngredient[];
};

/**
 * Toggle recipe selection and keep the shopping list in sync.
 * Fetches ingredients if they are not provided.
 */
export async function toggleRecipeSelectionWithShoppingList({
  supabase,
  recipeId,
  isSelected,
  ingredients,
}: ToggleSelectionParams) {
  await supabase
    .from("recipes")
    .update({ is_selected: !isSelected })
    .eq("id", recipeId);

  if (!isSelected) {
    const currentIngredients =
      ingredients ||
      (
        await supabase
          .from("recipe_ingredients")
          .select("*")
          .eq("recipe_id", recipeId)
      ).data ||
      [];

    if (currentIngredients.length === 0) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const shoppingItems = currentIngredients.map((ing) => {
      // Combine quantity and unit into a single string (e.g., "2 cups")
      let fullQuantity = ing.quantity || "";
      if (ing.unit) {
        fullQuantity = fullQuantity ? `${fullQuantity} ${ing.unit}` : ing.unit;
      }
      
      return {
        user_id: user?.id,
        recipe_id: recipeId,
        ingredient_id: ing.id,
        name: ing.name,
        quantity: fullQuantity || null,
        aisle_category: ing.aisle_category,
        checked: false,
      };
    });

    await supabase.from("shopping_list").insert(shoppingItems);
  } else {
    await supabase.from("shopping_list").delete().eq("recipe_id", recipeId);
  }
}
