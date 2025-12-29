import { openai } from "./openai";
import { NutritionData } from "./types";

interface IngredientNutrition {
  name: string;
  quantity: string;
  unit: string;
}

type NutritionPer100g = Required<NutritionData>;

interface IngredientProfile {
  per100g: NutritionPer100g;
  gramPerUnit?: Record<string, number>;
  gramPerPiece?: number;
}

const nutritionCache = new Map<string, NutritionData>();

// Lightweight defaults for common pantry items (per 100g). Approximations keep us off the LLM path for most recipes.
const INGREDIENT_PROFILES: Record<string, IngredientProfile> = {
  flour: {
    per100g: {
      calories: 364,
      protein_g: 10.0,
      carbs_g: 76.0,
      fat_g: 1.0,
      fiber_g: 2.7,
      sugar_g: 0.3,
      sodium_mg: 2,
      cholesterol_mg: 0,
      saturated_fat_g: 0.2,
    },
    gramPerUnit: { cup: 120 },
  },
  sugar: {
    per100g: {
      calories: 387,
      protein_g: 0,
      carbs_g: 100,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 100,
      sodium_mg: 1,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerUnit: { cup: 200 },
  },
  "brown sugar": {
    per100g: {
      calories: 380,
      protein_g: 0,
      carbs_g: 98,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 97,
      sodium_mg: 28,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerUnit: { cup: 213 },
  },
  butter: {
    per100g: {
      calories: 717,
      protein_g: 0.9,
      carbs_g: 0.1,
      fat_g: 81,
      fiber_g: 0,
      sugar_g: 0.1,
      sodium_mg: 11,
      cholesterol_mg: 215,
      saturated_fat_g: 51,
    },
    gramPerUnit: { tablespoon: 14, tbsp: 14, cup: 227 },
  },
  "olive oil": {
    per100g: {
      calories: 884,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 100,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 2,
      cholesterol_mg: 0,
      saturated_fat_g: 14,
    },
    gramPerUnit: { tablespoon: 14, tbsp: 14, teaspoon: 4.5, tsp: 4.5, cup: 216 },
  },
  milk: {
    per100g: {
      calories: 61,
      protein_g: 3.2,
      carbs_g: 5,
      fat_g: 3.3,
      fiber_g: 0,
      sugar_g: 5,
      sodium_mg: 43,
      cholesterol_mg: 10,
      saturated_fat_g: 1.9,
    },
    gramPerUnit: { cup: 244, tablespoon: 15, tbsp: 15 },
  },
  egg: {
    per100g: {
      calories: 143,
      protein_g: 13,
      carbs_g: 1.1,
      fat_g: 9.5,
      fiber_g: 0,
      sugar_g: 1.1,
      sodium_mg: 140,
      cholesterol_mg: 372,
      saturated_fat_g: 3.1,
    },
    gramPerPiece: 50,
  },
  "chicken breast": {
    per100g: {
      calories: 165,
      protein_g: 31,
      carbs_g: 0,
      fat_g: 3.6,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 74,
      cholesterol_mg: 85,
      saturated_fat_g: 1,
    },
  },
  beef: {
    per100g: {
      calories: 250,
      protein_g: 26,
      carbs_g: 0,
      fat_g: 15,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 72,
      cholesterol_mg: 90,
      saturated_fat_g: 6,
    },
  },
  onion: {
    per100g: {
      calories: 40,
      protein_g: 1.1,
      carbs_g: 9.3,
      fat_g: 0.1,
      fiber_g: 1.7,
      sugar_g: 4.2,
      sodium_mg: 4,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerUnit: { cup: 160 },
    gramPerPiece: 110,
  },
  garlic: {
    per100g: {
      calories: 149,
      protein_g: 6.4,
      carbs_g: 33,
      fat_g: 0.5,
      fiber_g: 2.1,
      sugar_g: 1,
      sodium_mg: 17,
      cholesterol_mg: 0,
      saturated_fat_g: 0.1,
    },
    gramPerPiece: 3, // per clove
  },
  tomato: {
    per100g: {
      calories: 18,
      protein_g: 0.9,
      carbs_g: 3.9,
      fat_g: 0.2,
      fiber_g: 1.2,
      sugar_g: 2.6,
      sodium_mg: 5,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerPiece: 120,
  },
  potato: {
    per100g: {
      calories: 77,
      protein_g: 2,
      carbs_g: 17,
      fat_g: 0.1,
      fiber_g: 2.2,
      sugar_g: 0.8,
      sodium_mg: 6,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerPiece: 170,
  },
  rice: {
    per100g: {
      calories: 130,
      protein_g: 2.7,
      carbs_g: 28,
      fat_g: 0.3,
      fiber_g: 0.4,
      sugar_g: 0.1,
      sodium_mg: 1,
      cholesterol_mg: 0,
      saturated_fat_g: 0.1,
    },
    gramPerUnit: { cup: 195 },
  },
  pasta: {
    per100g: {
      calories: 131,
      protein_g: 5,
      carbs_g: 25,
      fat_g: 1.1,
      fiber_g: 1.3,
      sugar_g: 0.6,
      sodium_mg: 6,
      cholesterol_mg: 0,
      saturated_fat_g: 0.2,
    },
    gramPerUnit: { cup: 140 },
  },
  cheese: {
    per100g: {
      calories: 402,
      protein_g: 25,
      carbs_g: 1.3,
      fat_g: 33,
      fiber_g: 0,
      sugar_g: 0.5,
      sodium_mg: 621,
      cholesterol_mg: 105,
      saturated_fat_g: 21,
    },
    gramPerUnit: { cup: 113 },
  },
  "baking powder": {
    per100g: {
      calories: 53,
      protein_g: 0,
      carbs_g: 28,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 11400,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerUnit: { teaspoon: 4, tsp: 4, tablespoon: 12, tbsp: 12 },
  },
  "baking soda": {
    per100g: {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 27360,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerUnit: { teaspoon: 4.6, tsp: 4.6, tablespoon: 13.8, tbsp: 13.8 },
  },
  salt: {
    per100g: {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 38758,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerUnit: { teaspoon: 6, tsp: 6, tablespoon: 18, tbsp: 18 },
  },
  "black pepper": {
    per100g: {
      calories: 251,
      protein_g: 10,
      carbs_g: 64,
      fat_g: 3.3,
      fiber_g: 25,
      sugar_g: 0.6,
      sodium_mg: 20,
      cholesterol_mg: 0,
      saturated_fat_g: 1.4,
    },
    gramPerUnit: { teaspoon: 2.3, tsp: 2.3 },
  },
  "vanilla extract": {
    per100g: {
      calories: 288,
      protein_g: 0.1,
      carbs_g: 12.7,
      fat_g: 0.1,
      fiber_g: 0,
      sugar_g: 12.7,
      sodium_mg: 9,
      cholesterol_mg: 0,
      saturated_fat_g: 0,
    },
    gramPerUnit: { teaspoon: 4.2, tsp: 4.2 },
  },
};

const ALIASES: Record<string, string> = {
  "all purpose flour": "flour",
  "ap flour": "flour",
  "granulated sugar": "sugar",
  "brown sugar": "brown sugar",
  "light brown sugar": "brown sugar",
  "dark brown sugar": "brown sugar",
  "extra virgin olive oil": "olive oil",
  evoo: "olive oil",
  "whole milk": "milk",
  "large egg": "egg",
  eggs: "egg",
  "boneless skinless chicken breast": "chicken breast",
  "chicken breasts": "chicken breast",
  "ground beef": "beef",
  "yellow onion": "onion",
  "red onion": "onion",
  cloves: "garlic",
  "garlic clove": "garlic",
  "garlic cloves": "garlic",
  tomatoes: "tomato",
  potatoes: "potato",
  "white rice": "rice",
  "brown rice": "rice",
  spaghetti: "pasta",
  penne: "pasta",
  parmesan: "cheese",
  mozzarella: "cheese",
};

const UNIT_ALIASES: Record<string, string> = {
  tsp: "teaspoon",
  tspn: "teaspoon",
  teaspoon: "teaspoon",
  teaspoons: "teaspoon",
  tbsp: "tablespoon",
  tablespoon: "tablespoon",
  tablespoons: "tablespoon",
  cup: "cup",
  cups: "cup",
  g: "gram",
  gram: "gram",
  grams: "gram",
  kg: "kilogram",
  kilogram: "kilogram",
  kilograms: "kilogram",
  oz: "ounce",
  ounce: "ounce",
  ounces: "ounce",
  lb: "pound",
  lbs: "pound",
  pound: "pound",
  pounds: "pound",
  ml: "milliliter",
  milliliter: "milliliter",
  milliliters: "milliliter",
  l: "liter",
  liter: "liter",
  liters: "liter",
  clove: "piece",
  cloves: "piece",
  piece: "piece",
  pieces: "piece",
};

const GENERIC_UNIT_TO_GRAMS: Record<string, number> = {
  teaspoon: 5,
  tablespoon: 15,
  cup: 240,
  gram: 1,
  kilogram: 1000,
  ounce: 28.35,
  pound: 453.6,
  milliliter: 1,
  liter: 1000,
  piece: 50,
};

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

function resolveIngredientKey(name: string): string | null {
  const normalized = normalizeName(name);
  if (ALIASES[normalized]) return ALIASES[normalized];
  if (INGREDIENT_PROFILES[normalized]) return normalized;
  // try partial match for common words
  const match = Object.keys(INGREDIENT_PROFILES).find((key) =>
    normalized.includes(key)
  );
  return match || null;
}

function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  return UNIT_ALIASES[normalized] || normalized;
}

function parseQuantity(qty: string): number {
  const trimmed = qty.trim();
  // handle simple fractions like "1/2" or "2 1/2"
  const fractionMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = parseFloat(fractionMatch[1]);
    const num = parseFloat(fractionMatch[2]);
    const den = parseFloat(fractionMatch[3]);
    if (!Number.isNaN(whole) && !Number.isNaN(num) && !Number.isNaN(den)) {
      return whole + num / den;
    }
  }
  const simpleFraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (simpleFraction) {
    const num = parseFloat(simpleFraction[1]);
    const den = parseFloat(simpleFraction[2]);
    if (!Number.isNaN(num) && !Number.isNaN(den)) {
      return num / den;
    }
  }
  const numeric = parseFloat(trimmed);
  if (!Number.isNaN(numeric)) return numeric;
  return 1;
}

function gramsForIngredient(
  profile: IngredientProfile,
  quantity: string,
  unit: string
): number | null {
  const normalizedUnit = normalizeUnit(unit);
  const qty = parseQuantity(quantity);

  if (profile.gramPerUnit && profile.gramPerUnit[normalizedUnit]) {
    return qty * profile.gramPerUnit[normalizedUnit];
  }

  if (normalizedUnit === "piece" && profile.gramPerPiece) {
    return qty * profile.gramPerPiece;
  }

  if (GENERIC_UNIT_TO_GRAMS[normalizedUnit]) {
    return qty * GENERIC_UNIT_TO_GRAMS[normalizedUnit];
  }

  // If no unit, assume grams-like quantity
  if (!unit) {
    return qty;
  }

  return null;
}

function sumNutrition(values: NutritionData[]): NutritionData {
  const total: NutritionData = {};
  for (const entry of values) {
    for (const key of Object.keys(entry) as (keyof NutritionData)[]) {
      const val = entry[key];
      if (typeof val !== "number") continue;
      total[key] = (total[key] || 0) + val;
    }
  }
  return total;
}

function divideNutrition(nutrition: NutritionData, divisor: number): NutritionData {
  const result: NutritionData = {};
  for (const key of Object.keys(nutrition) as (keyof NutritionData)[]) {
    const val = nutrition[key];
    if (typeof val !== "number") continue;
    result[key] = val / divisor;
  }
  return result;
}

function calculateDeterministicNutrition(
  ingredients: IngredientNutrition[],
  servings: number
): NutritionData | null {
  const perServingEntries: NutritionData[] = [];

  for (const ingredient of ingredients) {
    const key = resolveIngredientKey(ingredient.name);
    if (!key) {
      return null; // unknown ingredient forces fallback
    }
    const profile = INGREDIENT_PROFILES[key];
    const grams = gramsForIngredient(profile, ingredient.quantity, ingredient.unit);
    if (!grams) {
      return null;
    }

    const factor = grams / 100;
    const perServing: NutritionData = {};
    for (const nutrient of Object.keys(profile.per100g) as (keyof NutritionPer100g)[]) {
      const totalForIngredient = profile.per100g[nutrient] * factor;
      perServing[nutrient] = totalForIngredient / Math.max(servings, 1);
    }
    perServingEntries.push(perServing);
  }

  return sumNutrition(perServingEntries);
}

/**
 * Calculate nutrition data from ingredients.
 * Uses a deterministic lookup first; only falls back to the LLM when required.
 */
export async function calculateNutritionFromIngredients(
  ingredients: IngredientNutrition[],
  servings: number
): Promise<NutritionData | null> {
  if (!ingredients || ingredients.length === 0) {
    return null;
  }

  const cacheKey = JSON.stringify({
    ingredients: ingredients.map((i) => ({
      n: normalizeName(i.name),
      q: i.quantity,
      u: i.unit,
    })),
    servings,
  });

  if (nutritionCache.has(cacheKey)) {
    return nutritionCache.get(cacheKey)!;
  }

  // Try deterministic path first
  const deterministic = calculateDeterministicNutrition(ingredients, servings);
  if (deterministic) {
    nutritionCache.set(cacheKey, deterministic);
    return deterministic;
  }

  // Fallback: single LLM call for remaining cases
  try {
    const ingredientsList = ingredients
      .map((ing) => `${ing.quantity} ${ing.unit} ${ing.name}`.trim())
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

All values should be PER SERVING (already divided by servings). Use standard nutritional databases for common ingredients.`,
        },
        {
          role: "user",
          content: `Calculate nutrition per serving for this recipe:

Ingredients:
${ingredientsList}

Number of servings: ${servings}

Return the nutrition data as JSON.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return null;
    }

    const nutrition = JSON.parse(content) as NutritionData;
    const hasData = Object.values(nutrition).some(
      (val) => val !== null && val !== undefined && typeof val === "number"
    );

    if (hasData) {
      nutritionCache.set(cacheKey, nutrition);
      return nutrition;
    }
  } catch (error) {
    console.error("Error calculating nutrition via LLM fallback:", error);
  }

  return null;
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
