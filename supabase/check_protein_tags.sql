-- Check for duplicate protein tags
-- Run this first to see the current state

SELECT 
  id,
  name,
  category,
  created_at,
  (SELECT COUNT(*) FROM recipe_tags WHERE tag_id = tags.id) as recipe_count
FROM tags
WHERE name IN ('Protein Heavy', 'High Protein')
ORDER BY name;

-- This will show:
-- - If both tags exist
-- - How many recipes are using each tag
-- - The IDs of each tag
