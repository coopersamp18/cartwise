import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedRecipe {
  title: string;
  description: string;
  category: string;
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

export async function parseRecipeFromUrl(url: string, htmlContent: string): Promise<ParsedRecipe> {
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
        content: `URL: ${url}\n\nHTML Content:\n${htmlContent.substring(0, 15000)}`
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
