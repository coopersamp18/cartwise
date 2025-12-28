# Environment Variables Reference

This document lists all required environment variables for Cartwise.

## Required Variables

### Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find:**
- Log in to your Supabase project
- Go to Settings → API
- Copy the Project URL and anon/public key
- **Service Role Key**: Same page, but use the `service_role` key (starts with `eyJ...`)
  - ⚠️ **IMPORTANT**: Keep this secret! Only use server-side, never expose to client
  - Required for webhooks to bypass RLS policies

### OpenAI Configuration

```bash
OPENAI_API_KEY=sk-proj-...
```

**Where to find:**
- Log in to OpenAI Platform (platform.openai.com)
- Go to API Keys
- Create a new secret key

### Polar Configuration (Subscriptions)

You can configure both sandbox and production keys, then switch between them using the `POLAR_USE_SANDBOX` flag.

**Production Keys (Required):**
```bash
POLAR_API_KEY=polar_sk_production_key_here
POLAR_WEBHOOK_SECRET=whsec_production_secret_here
NEXT_PUBLIC_POLAR_PRODUCT_ID=prod_production_product_id_here
POLAR_ORG_SLUG=your-org-slug-here
```

**Sandbox Keys (Optional - for testing):**
```bash
POLAR_SANDBOX_API_KEY=polar_sk_sandbox_key_here
POLAR_SANDBOX_WEBHOOK_SECRET=whsec_sandbox_secret_here
NEXT_PUBLIC_POLAR_SANDBOX_PRODUCT_ID=prod_sandbox_product_id_here
POLAR_SANDBOX_ORG_SLUG=your-sandbox-org-slug-here
```

**Environment Switch:**
```bash
POLAR_USE_SANDBOX=true  # Set to "true" to use sandbox, "false" or omit for production
```

**Where to find:**
- **For Sandbox/Testing**: Log in to Polar sandbox dashboard at [sandbox.polar.sh](https://sandbox.polar.sh)
  - **API Key**: Settings → API Keys (in sandbox dashboard)
  - **Webhook Secret**: Settings → Webhooks → Create endpoint (in sandbox dashboard)
  - **Product ID**: Products → Your product → Copy ID (create a test product in sandbox)
  - **Organization Slug**: Found in your dashboard URL (e.g., `https://sandbox.polar.sh/your-org-slug`) or in Settings → Organization
- **For Production**: Log in to Polar dashboard (polar.sh)
  - **API Key**: Settings → API Keys
  - **Webhook Secret**: Settings → Webhooks → Create endpoint
  - **Product ID**: Products → Your product → Copy ID
  - **Organization Slug**: Found in your dashboard URL (e.g., `https://polar.sh/your-org-slug`) or in Settings → Organization

**Note**: You can keep both sets of keys in your `.env.local` file. Set `POLAR_USE_SANDBOX=true` to use sandbox, or set it to `false`/remove it to use production. The application will automatically use the correct API endpoint based on this setting.

## Setup Instructions

1. Create a `.env.local` file in the project root
2. Copy the template below
3. Replace placeholder values with your actual credentials
4. Never commit this file to version control (it's in .gitignore)

## Template

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Polar (Subscriptions - Production)
POLAR_API_KEY=
POLAR_WEBHOOK_SECRET=
NEXT_PUBLIC_POLAR_PRODUCT_ID=
POLAR_ORG_SLUG=

# Polar (Subscriptions - Sandbox/Testing - Optional)
POLAR_SANDBOX_API_KEY=
POLAR_SANDBOX_WEBHOOK_SECRET=
NEXT_PUBLIC_POLAR_SANDBOX_PRODUCT_ID=
POLAR_SANDBOX_ORG_SLUG=
POLAR_USE_SANDBOX=true  # Set to "true" for sandbox, "false" or omit for production
```

## Security Notes

- **Never** share these values publicly
- **Never** commit `.env.local` to git
- Use different values for development and production
- Rotate keys regularly, especially if compromised
- Use environment variables in your hosting platform (Vercel, etc.) for production

## Verification

To verify your environment variables are loaded:

1. Start the dev server: `npm run dev`
2. Check the console for any missing variable warnings
3. Try signing up and creating a recipe to test all integrations

## Troubleshooting

### "POLAR_API_KEY is not defined"
- Ensure the variable is in `.env.local`
- Restart your dev server after adding variables
- Check for typos in variable names

### "Supabase client error"
- Verify your Supabase URL and key are correct
- Check that your Supabase project is active
- Ensure you're using the anon/public key, not the service role key

### "OpenAI API error"
- Verify your API key is valid
- Check that you have credits in your OpenAI account
- Ensure the key starts with `sk-`

### "Polar checkout not working"
- Verify all three Polar variables are set
- Check that your product ID is correct
- Ensure webhook secret matches your Polar dashboard

## Production Deployment

When deploying to production (e.g., Vercel):

1. Add all environment variables in your hosting platform's dashboard
2. Update the Polar webhook URL to your production domain
3. Use production API keys (not test/development keys)
4. Verify all integrations work in production

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Polar Documentation](https://docs.polar.sh)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
