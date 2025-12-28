# Supabase Storage Setup for Profile Pictures

This guide will help you set up the Supabase Storage bucket for profile picture uploads.

## Step 1: Create the Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Enable this** (so profile pictures can be accessed via public URLs)
   - **File size limit**: 5 MB (or your preferred limit)
   - **Allowed MIME types**: `image/*` (or leave empty for all types)

5. Click **Create bucket**

## Step 2: Set Up Storage Policies (RLS)

After creating the bucket, you need to set up Row Level Security (RLS) policies so users can upload their own avatars.

1. In the Storage section, click on the `avatars` bucket
2. Go to the **Policies** tab
3. Click **New Policy**

### Policy 1: Allow users to upload their own avatars

**Policy Name**: `Users can upload their own avatars`

**Policy Definition**:
```sql
(
  bucket_id = 'avatars'::text
) AND (
  (auth.uid())::text = (storage.foldername(name))[1]
)
```

**Allowed Operation**: `INSERT`

**Target Roles**: `authenticated`

### Policy 2: Allow users to view all avatars (since bucket is public)

**Policy Name**: `Anyone can view avatars`

**Policy Definition**:
```sql
bucket_id = 'avatars'::text
```

**Allowed Operation**: `SELECT`

**Target Roles**: `public` (or `authenticated` if you want to restrict to logged-in users)

### Policy 3: Allow users to delete their own avatars

**Policy Name**: `Users can delete their own avatars`

**Policy Definition**:
```sql
(
  bucket_id = 'avatars'::text
) AND (
  (auth.uid())::text = (storage.foldername(name))[1]
)
```

**Allowed Operation**: `DELETE`

**Target Roles**: `authenticated`

### Policy 4: Allow users to update their own avatars

**Policy Name**: `Users can update their own avatars`

**Policy Definition**:
```sql
(
  bucket_id = 'avatars'::text
) AND (
  (auth.uid())::text = (storage.foldername(name))[1]
)
```

**Allowed Operation**: `UPDATE`

**Target Roles**: `authenticated`

## Alternative: Simpler Policy (If the above doesn't work)

If you're having issues with the folder-based policies, you can use a simpler approach that allows authenticated users to upload/delete any file in the bucket (since file names include the user ID):

**For INSERT, UPDATE, DELETE**:
```sql
bucket_id = 'avatars'::text AND auth.role() = 'authenticated'
```

**For SELECT** (public access):
```sql
bucket_id = 'avatars'::text
```

## Step 3: Verify the Setup

1. Try uploading a profile picture in the settings page
2. Check the browser console for any errors
3. If you see "Bucket not found" error, make sure the bucket name is exactly `avatars` (case-sensitive)

## Troubleshooting

### Error: "Bucket not found"
- Make sure the bucket name is exactly `avatars` (case-sensitive)
- Verify the bucket exists in your Supabase Storage dashboard

### Error: "new row violates row-level security policy"
- Check that the RLS policies are set up correctly
- Make sure the user is authenticated
- Verify the policy conditions match your file naming pattern

### Upload works but image doesn't display
- Check that the bucket is set to **Public**
- Verify the public URL is being generated correctly
- Check browser console for CORS or network errors
