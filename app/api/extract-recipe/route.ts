import { NextResponse } from "next/server";
import { parseRecipeFromText, parseRecipeFromUrl, ParsedRecipe } from "@/lib/openai";
import { calculateNutritionFromIngredients, parseServings } from "@/lib/nutrition";

async function applyNutritionFallback(recipe: ParsedRecipe) {
  if (!recipe.nutrition && recipe.ingredients && recipe.ingredients.length > 0) {
    const servings = parseServings(recipe.servings);
    const calculatedNutrition = await calculateNutritionFromIngredients(
      recipe.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity || "1",
        unit: ing.unit || "unit",
      })),
      servings
    );
    if (calculatedNutrition) {
      recipe.nutrition = calculatedNutrition;
    }
  }
  return recipe;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, url, text } = body;

    if (mode === "url") {
      if (!url) {
        return NextResponse.json(
          { error: "URL is required" },
          { status: 400 }
        );
      }

      // Fetch the webpage content
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s ceiling for slow sites

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch the URL (Status: ${response.status}). The website may be blocking automated requests. Try using "Paste Text" mode instead.` },
            { status: 400 }
          );
        }

        const htmlContent = await response.text();
        
        if (!htmlContent || htmlContent.length < 100) {
          return NextResponse.json(
            { error: "The webpage returned empty content. Try using 'Paste Text' mode instead." },
            { status: 400 }
          );
        }

        const recipe = await parseRecipeFromUrl(url, htmlContent);
        const withNutrition = await applyNutritionFallback(recipe);
        
        return NextResponse.json(withNutrition);
      } catch (error) {
        console.error("Fetch error:", error);
        return NextResponse.json(
          { error: "Unable to access this URL. The website may be blocking automated requests or require authentication. Please try using 'Paste Text' mode instead." },
          { status: 400 }
        );
      }
    } else if (mode === "text") {
      if (!text) {
        return NextResponse.json(
          { error: "Recipe text is required" },
          { status: 400 }
        );
      }

      const recipe = await parseRecipeFromText(text);
      const withNutrition = await applyNutritionFallback(recipe);
      
      return NextResponse.json(withNutrition);
    } else {
      return NextResponse.json(
        { error: "Invalid mode" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error extracting recipe:", error);
    return NextResponse.json(
      { error: "Failed to extract recipe" },
      { status: 500 }
    );
  }
}
