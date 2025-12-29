# Troubleshooting Guide

## "Failed to save recipe" Error

If you're getting a "Failed to save recipe" error when adding a new recipe, here are the steps to fix it:

### Step 1: Check Browser Console
Open your browser's developer console (F12 or right-click → Inspect → Console tab) and look for the detailed error message. This will tell you exactly what's failing.

### Step 2: Run the Database Migration

The most common cause is that the database migration hasn't been run yet. The migration adds new columns for tags, favorites, and improved time tracking.

**To fix:**
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Open the file `supabase/add_recipe_tags_and_favorites.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click "Run" to execute the migration

### Step 3: Verify Migration Success

After running the migration, you should see:
- New columns in the `recipes` table: `is_favorited`, `prep_time_minutes`, `cook_time_minutes`
- Index on `category` column (used for meal type filtering)
- New tables: `tags` and `recipe_tags`
- 20 pre-populated tags in the `tags` table

### Step 4: Try Again

After running the migration, try adding a recipe again. The error should be resolved.

### If the Error Persists

If you still get an error after running the migration:

1. **Check the error message in the console** - it will tell you exactly what's wrong
2. **Verify your Supabase connection** - make sure your environment variables are set correctly
3. **Check RLS policies** - ensure Row Level Security policies allow inserts for authenticated users

### Common Error Messages

- **"column X does not exist"**: The migration hasn't been run. Run the migration file.
- **"permission denied"**: Check your RLS policies in Supabase
- **"null value in column"**: A required field is missing. Check that the recipe has a title.

### Fallback Behavior

The code is designed to work even if the migration hasn't been run yet. It will:
- Save recipes without the new fields (prep_time_minutes, cook_time_minutes, etc.)
- Skip saving tags if the tags table doesn't exist
- Show a warning in the console but still save the recipe

If you see a warning about columns not existing, the recipe was still saved successfully, but you won't be able to use the filtering features until you run the migration.

**Note:** Category is auto-populated from recipe extraction, so you don't need to manually set it. The AI automatically detects whether a recipe is Breakfast, Lunch, Dinner, etc.
