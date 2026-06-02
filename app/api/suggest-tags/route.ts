import { NextResponse } from "next/server";
import { suggestTagsForRecipe, ParsedRecipe } from "@/lib/openai";
import { Tag } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipe, availableTags } = body as {
      recipe: ParsedRecipe;
      availableTags: Tag[];
    };

    if (!recipe || !availableTags) {
      return NextResponse.json(
        { error: "Recipe and availableTags are required" },
        { status: 400 }
      );
    }

    const suggestedTagNames = await suggestTagsForRecipe(recipe, availableTags);
    
    // Map tag names to tag IDs
    const suggestedTagIds = availableTags
      .filter((tag) => suggestedTagNames.includes(tag.name))
      .map((tag) => tag.id);

    return NextResponse.json({ suggestedTagIds });
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return NextResponse.json(
      { error: "Failed to suggest tags" },
      { status: 500 }
    );
  }
}
