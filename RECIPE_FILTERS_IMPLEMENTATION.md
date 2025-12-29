# Recipe Filters & Tags Implementation

This document describes the recipe filtering and tagging system that has been added to Cartwise.

## Overview

The implementation adds comprehensive filtering capabilities to help users find recipes based on:
- **Meal Type**: Breakfast, Lunch, Dinner, Snack, Appetizer, Dessert, Beverage, Side Dish
- **Dietary Tags**: Keto Friendly, Protein Heavy, Plant Based, Gluten Free, and many more
- **Time Filters**: Prep time, Cook time, and Total time (with preset ranges)
- **Favorites**: Star/favorite recipes for quick access

## Database Changes

### Migration File
Run the migration file `supabase/add_recipe_tags_and_favorites.sql` in your Supabase SQL Editor to:
1. Add `is_favorited` boolean column to recipes
2. Add `prep_time_minutes` and `cook_time_minutes` integer columns for better filtering
3. Use existing `category` column for meal types (auto-populated from recipe extraction)
4. Create `tags` table with common dietary tags
5. Create `recipe_tags` junction table for many-to-many relationship
6. Set up proper indexes and RLS policies

### Pre-populated Tags
The migration includes 20 common dietary tags:
- Keto Friendly, Protein Heavy, Plant Based, Vegan, Vegetarian
- Gluten Free, Dairy Free, Nut Free
- Calorie Smart, Carb Smart, Low Carb, High Fiber
- Gut Friendly, Paleo, Whole30, Mediterranean
- Low Sodium, High Protein, Low Fat, Sugar Free

## New Components

### RecipeFilters Component
Located at `components/RecipeFilters.tsx`
- Collapsible filter panel with active filter count badge
- Filter by favorites, meal type, time ranges, and dietary tags
- Clear all filters button
- Visual indicators for active filters

### TagSelector Component
Located at `components/TagSelector.tsx`
- Used in recipe create/edit forms
- Groups tags by category (dietary, cuisine, etc.)
- Shows selected tags with remove buttons
- Click to toggle tag selection

## Updated Pages

### Dashboard (`app/dashboard/page.tsx`)
- Added filter UI at the top of recipes tab
- Displays tags on recipe cards (up to 2 visible, with "+X more" indicator)
- Star/favorite button on each recipe card
- Real-time filtering as filters are applied
- Loads recipes with their associated tags

### New Recipe Page (`app/recipe/new/page.tsx`)
- Added meal type dropdown
- Added tag selector component
- Automatically parses time strings to minutes for better filtering
- Saves tags and meal type when creating recipes

### Edit Recipe Page (`app/recipe/[id]/edit/page.tsx`)
- Added meal type dropdown
- Added tag selector component
- Loads existing tags when editing
- Updates tags and meal type when saving

## TypeScript Types

Updated `lib/types.ts` with:
- `Tag` interface
- `RecipeTag` interface
- `MealType` type
- Extended `Recipe` interface with:
  - `category: string | null` (used for meal types, auto-populated)
  - `prep_time_minutes: number | null`
  - `cook_time_minutes: number | null`
  - `is_favorited: boolean`
  - `tags?: Tag[]` (populated via join)

## Filter Features

### Time Filters
- **Prep Time**: Filter by maximum prep time (15 min, 30 min, 45 min, 1 hour, 1.5 hours, 2+ hours)
- **Cook Time**: Filter by maximum cook time (same ranges)
- **Total Time**: Filter by maximum total time (prep + cook)

The system automatically parses time strings like "30 min" or "1 hour" to minutes for accurate filtering.

### Category Filter
Quick filter buttons for meal categories (auto-populated from recipe extraction):
- Breakfast, Lunch, Dinner, Snack, Appetizer, Dessert, Beverage, Side Dish, Soup, Salad

### Dietary Tags Filter
Multi-select filter for dietary preferences. Users can select multiple tags, and recipes matching any selected tag will be shown.

### Favorites Filter
Toggle to show only favorited/starred recipes.

## Usage

### For Users

1. **Filtering Recipes**:
   - Click the "Filters" button on the dashboard
   - Select desired filters (meal type, tags, time ranges, favorites)
   - Active filter count is shown on the button
   - Click "Clear" to remove all filters

2. **Favoriting Recipes**:
   - Click the star icon on any recipe card
   - Favorited recipes show a filled yellow star
   - Use the "Favorites Only" filter to see only starred recipes

3. **Adding Tags to Recipes**:
   - When creating or editing a recipe, scroll to the Tags section
   - Click tags to select/deselect them
   - Selected tags are shown at the top with remove buttons
   - Tags are grouped by category for easier browsing

4. **Category (Auto-populated)**:
   - Category is automatically detected when extracting recipes
   - You can manually edit it if needed when creating/editing recipes
   - This helps with filtering and organization

### For Developers

#### Adding New Tags
Tags can be added directly in Supabase:
```sql
INSERT INTO tags (name, category) VALUES
  ('New Tag Name', 'dietary');
```

#### Querying Recipes with Filters
The dashboard uses client-side filtering, but you can also filter server-side:
```typescript
// Filter by category
const { data } = await supabase
  .from('recipes')
  .select('*, recipe_tags(tag:tags(*))')
  .eq('category', 'Dinner');

// Filter by tags
const { data } = await supabase
  .from('recipes')
  .select('*, recipe_tags(tag:tags(*))')
  .eq('recipe_tags.tag_id', tagId);
```

## Future Enhancements

Potential improvements:
- Server-side filtering for better performance with large recipe collections
- Saved filter presets
- Tag categories in filter UI (group dietary tags separately)
- Search functionality combined with filters
- Sort options (by time, favorites, date added)
- Bulk tag editing
- Custom user-created tags
