import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { NutritionData, Tag } from "./types";

export interface ParsedRecipe {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  ingredients: {
    name: string;
    quantity: string;
    unit: string;
    aisleCategory: string;
  }[];
  steps: {
    stepNumber: number;
    instruction: string;
  }[];
  nutrition?: NutritionData; // Optional nutrition data per serving
}

export async function parseRecipeFromText(text: string): Promise<ParsedRecipe> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a recipe parser. Extract recipe information from the provided text and return it as JSON.

For ingredient aisle categories, use one of these: "Produce", "Dairy", "Meat & Seafood", "Bakery", "Frozen", "Pantry", "Canned Goods", "Condiments", "Beverages", "Snacks", "Spices", "Deli", "Other".

For recipe categories, use one of these: "Breakfast", "Lunch", "Dinner", "Appetizer", "Dessert", "Snack", "Beverage", "Side Dish", "Soup", "Salad".

If nutritional information is explicitly provided in the recipe text, extract it. Otherwise, omit the "nutrition" field entirely (we will calculate it automatically from ingredients).

Return valid JSON with this structure:
{
  "title": "Recipe Title",
  "description": "Brief description",
  "category": "Dinner",
  "servings": "4",
  "prepTime": "15 min",
  "cookTime": "30 min",
  "ingredients": [
    {"name": "ingredient name", "quantity": "1", "unit": "cup", "aisleCategory": "Produce"}
  ],
  "steps": [
    {"stepNumber": 1, "instruction": "Step instruction"}
  ],
  "nutrition": {
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
}

Note: Only include the "nutrition" object if it's explicitly provided in the recipe. If not provided, omit it entirely.`
      },
      {
        role: "user",
        content: text
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }
  
  return JSON.parse(content) as ParsedRecipe;
}

function sanitizeHtmlForModel(htmlContent: string): string {
  // Strip scripts/styles to reduce token usage and noise
  const withoutScripts = htmlContent.replace(/<script[\s\S]*?<\/script>/gi, "");
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, "");
  const withoutComments = withoutStyles.replace(/<!--[\s\S]*?-->/g, "");
  const collapsed = withoutComments.replace(/\s+/g, " ").trim();
  // Cap to keep prompts small (~8k chars)
  return collapsed.slice(0, 8000);
}

// Helper function to extract image URLs from HTML
function extractImageUrls(htmlContent: string, baseUrl: string): string[] {
  const imageUrls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = Array.from(htmlContent.matchAll(imgRegex));
  
  for (const match of matches) {
    let imageUrl = match[1];
    
    // Convert relative URLs to absolute
    if (imageUrl.startsWith('//')) {
      imageUrl = `https:${imageUrl}`;
    } else if (imageUrl.startsWith('/')) {
      try {
        const urlObj = new URL(baseUrl);
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
      } catch (e) {
        continue;
      }
    } else if (!imageUrl.startsWith('http')) {
      try {
        const urlObj = new URL(baseUrl);
        imageUrl = `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
      } catch (e) {
        continue;
      }
    }
    
    // Filter out common non-recipe images
    const lowerUrl = imageUrl.toLowerCase();
    if (
      !lowerUrl.includes('logo') &&
      !lowerUrl.includes('icon') &&
      !lowerUrl.includes('avatar') &&
      !lowerUrl.includes('profile') &&
      !lowerUrl.includes('button') &&
      !lowerUrl.includes('badge') &&
      !lowerUrl.includes('spacer') &&
      !lowerUrl.includes('pixel') &&
      !lowerUrl.endsWith('.svg') &&
      !lowerUrl.endsWith('.gif')
    ) {
      imageUrls.push(imageUrl);
    }
  }
  
  // Also check for Open Graph and Twitter Card images
  const ogImageRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i;
  const ogMatch = htmlContent.match(ogImageRegex);
  if (ogMatch && ogMatch[1]) {
    let ogImageUrl = ogMatch[1];
    if (ogImageUrl.startsWith('//')) {
      ogImageUrl = `https:${ogImageUrl}`;
    } else if (ogImageUrl.startsWith('/')) {
      try {
        const urlObj = new URL(baseUrl);
        ogImageUrl = `${urlObj.protocol}//${urlObj.host}${ogImageUrl}`;
      } catch (e) {
        // ignore
      }
    }
    if (!imageUrls.includes(ogImageUrl)) {
      imageUrls.unshift(ogImageUrl); // Prioritize OG image
    }
  }
  
  return imageUrls;
}

export async function parseRecipeFromUrl(url: string, htmlContent: string): Promise<ParsedRecipe> {
  // Extract image URLs from HTML (limit to keep prompt compact)
  const imageUrls = extractImageUrls(htmlContent, url).slice(0, 5);
  const sanitizedHtml = sanitizeHtmlForModel(htmlContent);
  
  // Create image context for OpenAI
  const imageContext = imageUrls.length > 0
    ? `\n\nFound ${imageUrls.length} potential recipe images. Image URLs:\n${imageUrls.map((img, i) => `${i + 1}. ${img}`).join('\n')}\n\nPlease identify the best recipe cover image URL (the main photo of the finished dish) and include it in the "imageUrl" field. If no suitable image is found, set "imageUrl" to null.`
    : '\n\nNo images found in the HTML. Set "imageUrl" to null.';

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a recipe parser. Extract recipe information from the provided HTML content of a recipe webpage and return it as JSON.

For ingredient aisle categories, use one of these: "Produce", "Dairy", "Meat & Seafood", "Bakery", "Frozen", "Pantry", "Canned Goods", "Condiments", "Beverages", "Snacks", "Spices", "Deli", "Other".

For recipe categories, use one of these: "Breakfast", "Lunch", "Dinner", "Appetizer", "Dessert", "Snack", "Beverage", "Side Dish", "Soup", "Salad".

If nutritional information is explicitly provided in the recipe, extract it. Otherwise, omit the "nutrition" field entirely (we will calculate it automatically from ingredients).

Return valid JSON with this structure:
{
  "title": "Recipe Title",
  "description": "Brief description",
  "category": "Dinner",
  "imageUrl": "https://example.com/recipe-image.jpg" or null,
  "servings": "4",
  "prepTime": "15 min",
  "cookTime": "30 min",
  "ingredients": [
    {"name": "ingredient name", "quantity": "1", "unit": "cup", "aisleCategory": "Produce"}
  ],
  "steps": [
    {"stepNumber": 1, "instruction": "Step instruction"}
  ],
  "nutrition": {
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
}

Note: Only include the "nutrition" object if it's explicitly provided in the recipe. If not provided, omit it entirely.`
      },
      {
        role: "user",
        content: `URL: ${url}\n\nHTML Content (sanitized):\n${sanitizedHtml}${imageContext}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }
  
  return JSON.parse(content) as ParsedRecipe;
}

/**
 * Suggests appropriate tags for a recipe based on its content using AI.
 * Returns an array of tag names that match the available tags.
 */
export async function suggestTagsForRecipe(
  recipe: ParsedRecipe,
  availableTags: Tag[]
): Promise<string[]> {
  // Build a list of available tag names for the AI to choose from
  const availableTagNames = availableTags.map((tag) => tag.name);
  
  // Build recipe summary for AI analysis
  const recipeSummary = {
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    ingredients: recipe.ingredients.map((ing) => ing.name).join(", "),
    nutrition: recipe.nutrition,
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a recipe tagging assistant. Analyze the provided recipe and suggest the most appropriate tags from the available tags list.

Available tags: ${availableTagNames.join(", ")}

Consider:
- Ingredients (e.g., if it contains meat, suggest "Protein Heavy"; if no animal products, suggest "Vegan" or "Plant Based")
- Nutritional profile (e.g., if low carbs, suggest "Low Carb" or "Keto Friendly"; if high fiber, suggest "High Fiber")
- Dietary restrictions (e.g., if no gluten ingredients, suggest "Gluten Free"; if no dairy, suggest "Dairy Free")
- Cooking methods and cuisine types if relevant tags exist

Be selective - only suggest tags that are clearly applicable. Aim for 2-5 tags maximum unless the recipe clearly fits many categories.

Return a JSON object with this structure:
{
  "suggestedTags": ["Tag Name 1", "Tag Name 2", ...]
}

Only include tag names that exactly match the available tags list. If no tags are clearly applicable, return an empty array.`
      },
      {
        role: "user",
        content: `Recipe to analyze:\n${JSON.stringify(recipeSummary, null, 2)}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return [];
  }

  try {
    const result = JSON.parse(content) as { suggestedTags: string[] };
    // Filter to only include tags that actually exist in availableTags
    const validTagNames = result.suggestedTags?.filter((tagName) =>
      availableTagNames.includes(tagName)
    ) || [];
    return validTagNames;
  } catch (error) {
    console.error("Error parsing tag suggestions:", error);
    return [];
  }
}
