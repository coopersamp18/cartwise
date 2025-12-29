-- Run this in Supabase SQL Editor to verify all migrations have been applied
-- This will show which columns exist and which are missing

SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('is_favorited', 'is_archived', 'prep_time_minutes', 'cook_time_minutes', 
                         'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 
                         'sodium_mg', 'cholesterol_mg', 'saturated_fat_g') 
    THEN '✅ Found'
    ELSE '⚠️ Unexpected'
  END as status
FROM information_schema.columns 
WHERE table_name = 'recipes' 
AND column_name IN (
  'is_favorited', 
  'is_archived', 
  'prep_time_minutes', 
  'cook_time_minutes',
  'calories',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'sugar_g',
  'sodium_mg',
  'cholesterol_mg',
  'saturated_fat_g'
)
ORDER BY column_name;

-- Also check if tags table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags')
    THEN '✅ Tags table exists'
    ELSE '❌ Tags table MISSING - run add_recipe_tags_and_favorites.sql'
  END as tags_table_status;

-- Check if recipe_tags junction table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recipe_tags')
    THEN '✅ Recipe_tags table exists'
    ELSE '❌ Recipe_tags table MISSING - run add_recipe_tags_and_favorites.sql'
  END as recipe_tags_table_status;
