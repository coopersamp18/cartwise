-- Migration: Add recipe archiving functionality
-- Run this in Supabase SQL Editor

-- Add is_archived column to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create index for better performance when filtering archived recipes
CREATE INDEX IF NOT EXISTS idx_recipes_is_archived ON recipes(is_archived);

-- Add comment for documentation
COMMENT ON COLUMN recipes.is_archived IS 'Whether the recipe is archived (hidden from main view)';
