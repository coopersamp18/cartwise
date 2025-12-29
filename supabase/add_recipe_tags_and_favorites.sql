-- Migration: Add recipe tags, favorites, and improve time fields
-- Run this in Supabase SQL Editor

-- Add is_favorited column to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT false;

-- Convert prep_time and cook_time to INTEGER (stored as minutes)
-- First, add new columns
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER;

-- Note: We use the existing 'category' column for meal types (Breakfast, Lunch, Dinner, etc.)
-- Category is auto-populated from recipe extraction, so no new column needed

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'dietary', 'cuisine', 'cooking_method', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recipe_tags junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS recipe_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, tag_id)
);

-- Insert common dietary tags
INSERT INTO tags (name, category) VALUES
  ('Keto Friendly', 'dietary'),
  ('Protein Heavy', 'dietary'),
  ('Plant Based', 'dietary'),
  ('Vegan', 'dietary'),
  ('Vegetarian', 'dietary'),
  ('Gluten Free', 'dietary'),
  ('Dairy Free', 'dietary'),
  ('Nut Free', 'dietary'),
  ('Calorie Smart', 'dietary'),
  ('Carb Smart', 'dietary'),
  ('Low Carb', 'dietary'),
  ('High Fiber', 'dietary'),
  ('Gut Friendly', 'dietary'),
  ('Paleo', 'dietary'),
  ('Whole30', 'dietary'),
  ('Mediterranean', 'dietary'),
  ('Low Sodium', 'dietary'),
  ('High Protein', 'dietary'),
  ('Low Fat', 'dietary'),
  ('Sugar Free', 'dietary')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_is_favorited ON recipes(is_favorited);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time_minutes ON recipes(prep_time_minutes);
CREATE INDEX IF NOT EXISTS idx_recipes_cook_time_minutes ON recipes(cook_time_minutes);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- Enable RLS on new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies (users can view all tags, but only admins can modify - for now, allow all)
CREATE POLICY "Users can view all tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Users can insert tags" ON tags
  FOR INSERT WITH CHECK (true);

-- Recipe tags policies (through recipe ownership)
CREATE POLICY "Users can view tags of their recipes" ON recipe_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tags for their recipes" ON recipe_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags from their recipes" ON recipe_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM recipes WHERE recipes.id = recipe_tags.recipe_id AND recipes.user_id = auth.uid()
    )
  );
