import { openai } from "./openai";
import { NutritionData } from "./types";

interface IngredientNutrition {
  name: string;
  quantity: string;
  unit: string;
}

/**
 * Calculate nutrition data from ingredients using OpenAI
 * This function looks up nutritional values for each ingredient and calculates totals
 */
export async function calculateNutritionFromIngredients(
  ingredients: IngredientNutrition[],
  servings: number
): Promise<NutritionData | null> {
  if (!ingredients || ingredients.length === 0) {
    return null;
  }

  try {
    // Create a prompt for OpenAI to calculate nutrition
    const ingredientsList = ingredients
      .map((ing) => `${ing.quantity} ${ing.unit} ${ing.name}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a nutrition calculator. Given a list of ingredients with quantities, calculate the total nutritional values for the entire recipe, then divide by the number of servings to get per-serving values.

For each ingredient, look up standard nutritional values per unit (e.g., per cup, per gram, per piece). Then multiply by the quantity and sum all ingredients. Finally, divide by the number of servings.

Return ONLY valid JSON with this exact structure (all values should be numbers, or null if unknown):
{
  "calories": 250,
  "protein_g": 15.5,
  "carbs_g": 30.0,
  "fat_g": 8.5,
  "fiber_g": 5.0,
  "sugar_g": 10.0,
  "sodium_mg": 500.0,
  "cholesterol_mg": 50.0,
  "saturated_fat_g": 3.0
}

All values should be PER SERVING (already divided by servings). Use standard nutritional databases for common ingredients.`
        },
        {
          role: "user",
          content: `Calculate nutrition per serving for this recipe:

Ingredients:
${ingredientsList}

Number of servings: ${servings}

Return the nutrition data as JSON.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more consistent calculations
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return null;
    }

    const nutrition = JSON.parse(content) as NutritionData;
    
    // Validate that we got some data
    const hasData = Object.values(nutrition).some(
      (val) => val !== null && val !== undefined && typeof val === "number"
    );

    return hasData ? nutrition : null;
  } catch (error) {
    console.error("Error calculating nutrition:", error);
    return null;
  }
}

/**
 * Parse serving string to number (e.g., "4" -> 4, "4-6" -> 4)
 */
export function parseServings(servings: string | null | undefined): number {
  if (!servings) return 1;
  
  // Extract first number from string
  const match = servings.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}
