-- Migration: Consolidate duplicate protein tags
-- This merges "High Protein" into "Protein Heavy" and removes the duplicate
-- Run this in Supabase SQL Editor

-- Step 1: Check if both tags exist
DO $$
DECLARE
  high_protein_id UUID;
  protein_heavy_id UUID;
BEGIN
  -- Get the IDs of both tags
  SELECT id INTO high_protein_id FROM tags WHERE name = 'High Protein';
  SELECT id INTO protein_heavy_id FROM tags WHERE name = 'Protein Heavy';

  -- Only proceed if "High Protein" exists
  IF high_protein_id IS NOT NULL THEN
    -- If "Protein Heavy" doesn't exist, rename "High Protein" to "Protein Heavy"
    IF protein_heavy_id IS NULL THEN
      UPDATE tags SET name = 'Protein Heavy' WHERE id = high_protein_id;
      RAISE NOTICE 'Renamed "High Protein" to "Protein Heavy"';
    ELSE
      -- Both tags exist - merge "High Protein" into "Protein Heavy"
      -- First, delete recipe_tags where the recipe already has "Protein Heavy"
      -- (to avoid unique constraint violations)
      DELETE FROM recipe_tags
      WHERE tag_id = high_protein_id
      AND recipe_id IN (
        SELECT recipe_id FROM recipe_tags WHERE tag_id = protein_heavy_id
      );
      
      -- Now update remaining recipe_tags that reference "High Protein" to use "Protein Heavy"
      UPDATE recipe_tags
      SET tag_id = protein_heavy_id
      WHERE tag_id = high_protein_id;
      
      -- Now delete the "High Protein" tag
      DELETE FROM tags WHERE id = high_protein_id;
      
      RAISE NOTICE 'Merged "High Protein" into "Protein Heavy" and removed duplicate';
    END IF;
  ELSE
    RAISE NOTICE '"High Protein" tag does not exist - no action needed';
  END IF;
END $$;
