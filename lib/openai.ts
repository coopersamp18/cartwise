import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  ]
}`
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

// Helper function to extract image URLs from HTML
function extractImageUrls(htmlContent: string, baseUrl: string): string[] {
  const imageUrls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = htmlContent.matchAll(imgRegex);
  
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
  // Extract image URLs from HTML
  const imageUrls = extractImageUrls(htmlContent, url);
  
  // Create image context for OpenAI
  const imageContext = imageUrls.length > 0
    ? `\n\nFound ${imageUrls.length} potential recipe images. Image URLs:\n${imageUrls.slice(0, 10).map((img, i) => `${i + 1}. ${img}`).join('\n')}\n\nPlease identify the best recipe cover image URL (the main photo of the finished dish) and include it in the "imageUrl" field. If no suitable image is found, set "imageUrl" to null.`
    : '\n\nNo images found in the HTML. Set "imageUrl" to null.';

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a recipe parser. Extract recipe information from the provided HTML content of a recipe webpage and return it as JSON.

For ingredient aisle categories, use one of these: "Produce", "Dairy", "Meat & Seafood", "Bakery", "Frozen", "Pantry", "Canned Goods", "Condiments", "Beverages", "Snacks", "Spices", "Deli", "Other".

For recipe categories, use one of these: "Breakfast", "Lunch", "Dinner", "Appetizer", "Dessert", "Snack", "Beverage", "Side Dish", "Soup", "Salad".

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
  ]
}`
      },
      {
        role: "user",
        content: `URL: ${url}\n\nHTML Content:\n${htmlContent.substring(0, 15000)}${imageContext}`
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
