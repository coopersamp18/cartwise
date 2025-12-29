export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null; // Auto-populated from recipe extraction (Breakfast, Lunch, Dinner, etc.)
  source_url: string | null;
  image_url: string | null;
  servings: string | null;
  prep_time: string | null; // Legacy field, kept for backward compatibility
  cook_time: string | null; // Legacy field, kept for backward compatibility
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  is_selected: boolean;
  is_favorited: boolean;
  created_at: string;
  tags?: Tag[]; // Populated via join
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  aisle_category: string;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
  recipe_id: string | null;
  ingredient_id: string | null;
  name: string;
  quantity: string | null;
  aisle_category: string;
  checked: boolean;
  created_at: string;
}

export type AisleCategory = 
  | "Produce"
  | "Dairy"
  | "Meat & Seafood"
  | "Bakery"
  | "Frozen"
  | "Pantry"
  | "Canned Goods"
  | "Condiments"
  | "Beverages"
  | "Snacks"
  | "Spices"
  | "Deli"
  | "Other";

export type RecipeCategory =
  | "Breakfast"
  | "Lunch"
  | "Dinner"
  | "Appetizer"
  | "Dessert"
  | "Snack"
  | "Beverage"
  | "Side Dish"
  | "Soup"
  | "Salad";

export interface Tag {
  id: string;
  name: string;
  category: "dietary" | "cuisine" | "cooking_method" | "other";
  created_at: string;
}

export interface RecipeTag {
  id: string;
  recipe_id: string;
  tag_id: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  status: "trial" | "active" | "canceled" | "expired" | "inactive" | "past_due" | "unpaid" | "revoked";
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
