# Vercel Deployment Troubleshooting Guide

## Quick Checks

### 1. Verify Database Migrations Are Run
The following SQL migrations must be run in your Supabase SQL Editor:

**Required migrations (in order):**
- `supabase/add_recipe_tags_and_favorites.sql` - Adds tags, favorites, prep/cook time
- `supabase/add_nutrition_data.sql` - Adds nutrition columns
- `supabase/add_recipe_archiving.sql` - Adds is_archived column

**To check if migrations are run:**
1. Go to Supabase Dashboard → SQL Editor
2. Run this query to check for required columns:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recipes' 
AND column_name IN ('is_favorited', 'is_archived', 'prep_time_minutes', 'cook_time_minutes', 'calories');
```

If any columns are missing, run the corresponding migration file.

### 2. Check Vercel Deployment Status
1. Go to your Vercel dashboard
2. Check the latest deployment:
   - Should show commit `9e66925` or later
   - Status should be "Ready" (green)
   - Check the build logs for any errors

### 3. Clear Browser Cache
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
2. Or open in incognito/private mode
3. Or clear browser cache completely

### 4. Check Browser Console for Errors
1. Open browser DevTools (F12)
2. Check Console tab for any JavaScript errors
3. Check Network tab for failed API requests

### 5. Verify Features Are Actually Deployed

**Expected features to see:**
- ✅ Recipe filters (category, tags, prep time) - should be visible at top of dashboard
- ✅ Favorites button (star icon) - should be visible next to filters
- ✅ Show Archived button - should be visible next to favorites
- ✅ Star icon on recipe cards - below image, right side
- ✅ Shopping cart icon on recipe cards - below image, right side
- ✅ Archive button on recipe cards - bottom right (only when viewing active recipes)
- ✅ Nutrition table - should appear on recipe detail pages

### 6. Force a New Deployment
If changes still aren't showing:

```bash
# Make a small change to trigger rebuild
git commit --allow-empty -m "Trigger Vercel rebuild"
git push
```

### 7. Check Environment Variables
Verify these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (if needed)

### 8. Verify Code is in Repository
Check GitHub to ensure these files exist:
- `components/RecipeFilters.tsx`
- `components/NutritionTable.tsx`
- `app/dashboard/page.tsx` (should have showArchived, showFavorites, filters)

## Most Common Issues

1. **Database migrations not run** - Features won't work if database columns don't exist
2. **Browser cache** - Old JavaScript files cached in browser
3. **Vercel build cache** - Sometimes Vercel caches old builds (try empty commit above)

## Still Not Working?

If after all these checks the features still don't appear:
1. Share a screenshot of what you see vs. what you expect
2. Share browser console errors (if any)
3. Share Vercel deployment logs
4. Verify you're looking at the correct Vercel URL (not localhost)
