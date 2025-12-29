-- Migration: Add nutrition data to recipes
-- Run this in Supabase SQL Editor

-- Add nutrition columns to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS calories INTEGER,
ADD COLUMN IF NOT EXISTS protein_g DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS carbs_g DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS fat_g DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS fiber_g DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS sugar_g DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS sodium_mg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS cholesterol_mg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS saturated_fat_g DECIMAL(10, 2);

-- Create index for filtering by calories
CREATE INDEX IF NOT EXISTS idx_recipes_calories ON recipes(calories);

-- Add comment for documentation
COMMENT ON COLUMN recipes.calories IS 'Total calories per serving';
COMMENT ON COLUMN recipes.protein_g IS 'Protein in grams per serving';
COMMENT ON COLUMN recipes.carbs_g IS 'Carbohydrates in grams per serving';
COMMENT ON COLUMN recipes.fat_g IS 'Total fat in grams per serving';
COMMENT ON COLUMN recipes.fiber_g IS 'Dietary fiber in grams per serving';
COMMENT ON COLUMN recipes.sugar_g IS 'Sugar in grams per serving';
COMMENT ON COLUMN recipes.sodium_mg IS 'Sodium in milligrams per serving';
COMMENT ON COLUMN recipes.cholesterol_mg IS 'Cholesterol in milligrams per serving';
COMMENT ON COLUMN recipes.saturated_fat_g IS 'Saturated fat in grams per serving';
