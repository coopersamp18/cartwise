export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  source_url: string | null;
  servings: string | null;
  prep_time: string | null;
  cook_time: string | null;
  is_selected: boolean;
  created_at: string;
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

export interface Subscription {
  id: string;
  user_id: string;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  status: "trial" | "active" | "canceled" | "expired" | "inactive";
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
