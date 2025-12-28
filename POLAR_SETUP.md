# Polar Subscription Setup Guide

This guide will help you set up Polar subscriptions for Cartwise.

## Sandbox vs Production

This application is currently configured to use **Polar's sandbox environment** for testing. The sandbox allows you to test the full subscription flow without processing real payments.

- **Sandbox**: [https://sandbox.polar.sh](https://sandbox.polar.sh) - Use for testing
- **Production**: [https://polar.sh](https://polar.sh) - Use for live payments

**Test Card**: Use `4242 4242 4242 4242` with any future expiration date and any CVC for successful test payments.

## Step 1: Create a Polar Sandbox Account

1. Go to [https://sandbox.polar.sh](https://sandbox.polar.sh)
2. Sign up for a new account (separate from production)
3. Complete the onboarding process
4. Create a new organization in the sandbox environment

## Step 2: Create a Product in Sandbox

1. In your Polar sandbox dashboard, navigate to **Products**
2. Click **Create Product**
3. Set up your product with these details:
   - **Name**: Cartwise Subscription
   - **Price**: $5.00 USD
   - **Billing Period**: Monthly
   - **Trial Period**: 3 days
4. Save the product and copy the **Product ID** (starts with `prod_`)

## Step 3: Get Your Sandbox API Keys

1. In Polar sandbox dashboard, go to **Settings** → **API Keys**
2. Create a new API key or use the existing one
3. Copy your **Secret Key** (starts with `polar_sk_`)
4. Go to **Settings** → **Webhooks**
5. Create a webhook endpoint (see Step 5 below) and copy the **Webhook Secret** (starts with `whsec_`)

## Step 4: Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# Polar Configuration
POLAR_API_KEY=polar_sk_your_secret_key_here
POLAR_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_POLAR_PRODUCT_ID=prod_your_product_id_here

# Set to "true" to use sandbox environment, "false" or omit for production
POLAR_USE_SANDBOX=true

# Optional: Separate sandbox credentials (if different from production)
POLAR_SANDBOX_API_KEY=polar_sk_sandbox_key_here
POLAR_SANDBOX_WEBHOOK_SECRET=whsec_sandbox_secret_here
NEXT_PUBLIC_POLAR_SANDBOX_PRODUCT_ID=prod_sandbox_id_here
```

**Note**: The application now uses the official Polar SDK (`@polar-sh/sdk`) for type-safe API interactions and built-in webhook verification.

## Step 5: Set Up Webhooks in Sandbox

1. In Polar sandbox dashboard, go to **Settings** → **Webhooks**
2. Click **Add Endpoint**
3. Enter your webhook URL:
   - **Development**: `https://your-ngrok-url.ngrok.io/api/polar/webhook`
   - **Production**: `https://yourdomain.com/api/polar/webhook`
4. Select these events to listen for:
   - `checkout.completed`
   - `subscription.active`
   - `subscription.canceled`
   - `subscription.updated`
   - `subscription.revoked`
5. Save the webhook endpoint
6. Copy the **Webhook Secret** (starts with `whsec_`) - you'll need this for Step 3

## Step 6: Update Database Schema

Run the updated schema in your Supabase SQL Editor:

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Run the contents of `supabase/schema.sql`
4. This will create the `subscriptions` table with proper RLS policies

## Step 7: Test the Integration

### Testing Locally with ngrok

1. Install ngrok: `npm install -g ngrok`
2. Start your Next.js dev server: `npm run dev`
3. In another terminal, start ngrok: `ngrok http 3000`
4. Copy the ngrok URL and update your Polar webhook endpoint
5. Test the signup flow:
   - Sign up with a new email
   - Verify your email
   - You should be redirected to `/auth/subscribe`
   - Click "Start Free Trial"
   - Complete the Polar checkout
   - You should be redirected back to the success page
   - Check your Supabase database to verify the subscription was created

### Testing the Webhook

1. After completing a checkout, check your Polar dashboard for webhook delivery logs
2. Verify that the webhook was received successfully (200 status)
3. Check your Supabase `subscriptions` table to confirm the subscription record was created

## Step 8: Go Live

When you're ready to deploy to production:

1. Update your environment variables in your hosting platform (Vercel, etc.)
2. Update the Polar webhook URL to your production domain
3. Test the full flow in production
4. Monitor webhook deliveries in the Polar dashboard

## Technical Implementation

### Polar SDK Integration

The application uses the official Polar SDK for all API interactions:

**Client Initialization** (`lib/polar.ts`):
```typescript
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_API_KEY,
  server: "sandbox", // or "production"
});
```

**Checkout Creation** (`app/api/polar/create-checkout/route.ts`):
- Uses `polar.checkouts.create()` for type-safe checkout session creation
- Automatically handles environment switching (sandbox/production)
- Includes proper error handling with typed error objects

**Webhook Verification** (`app/api/polar/webhook/route.ts`):
- Uses `validateEvent()` from `@polar-sh/sdk/webhooks`
- Automatically verifies webhook signatures using Svix format
- Throws `WebhookVerificationError` for invalid signatures

### Benefits of SDK Integration

- ✅ **Type Safety**: Full TypeScript support with autocomplete
- ✅ **Cleaner Code**: Less boilerplate compared to manual fetch calls
- ✅ **Built-in Verification**: Secure webhook signature validation
- ✅ **Error Handling**: Typed error objects for better debugging
- ✅ **Environment Switching**: Easy toggle between sandbox and production

## Troubleshooting

### Webhook Not Receiving Events

- Verify your webhook URL is publicly accessible
- Check that the webhook secret matches your environment variable
- Review webhook delivery logs in Polar dashboard
- Check your application logs for any errors
- Ensure you're using the correct secret for your environment (sandbox vs production)

### Subscription Not Created

- Check the webhook payload in Polar dashboard
- Verify the `user_id` is being passed in the checkout metadata
- Check your Supabase logs for any RLS policy issues
- Ensure the `subscriptions` table exists and has proper permissions
- Verify webhook signature is being validated correctly

### Users Can't Access Dashboard

- Verify the subscription record exists in Supabase
- Check that the subscription status is either "trial" or "active"
- Verify the trial_ends_at or current_period_end dates are in the future
- Check middleware logs for any errors

### SDK-Related Issues

- Ensure `@polar-sh/sdk` is installed: `npm install @polar-sh/sdk`
- Verify `POLAR_USE_SANDBOX` environment variable is set correctly
- Check that API keys match the environment (sandbox keys for sandbox, production keys for production)
- Review TypeScript errors for type mismatches in SDK calls

## Support

If you encounter any issues:

1. Check Polar documentation: [https://docs.polar.sh](https://docs.polar.sh)
2. Review webhook delivery logs in Polar dashboard
3. Check your application logs for errors
4. Verify all environment variables are set correctly

## Flow Diagram

```
User Signs Up
    ↓
Email Verification
    ↓
Redirect to /auth/subscribe
    ↓
User Clicks "Start Free Trial"
    ↓
Create Polar Checkout Session (API)
    ↓
Redirect to Polar Checkout
    ↓
User Completes Checkout
    ↓
Polar Sends Webhook (checkout.completed)
    ↓
Create Subscription Record (trial status, 3 days)
    ↓
Redirect to /auth/subscribe/success
    ↓
User Can Access Dashboard
```

## Features Implemented

✅ Database schema with subscriptions table
✅ Subscription utility functions
✅ Polar SDK integration (`@polar-sh/sdk`)
✅ Type-safe Polar client utility (`lib/polar.ts`)
✅ Polar checkout API endpoint (using SDK)
✅ Webhook handler with SDK verification
✅ Subscription signup page
✅ Success page with status checking
✅ Auth callback with subscription check
✅ Middleware protection for routes
✅ Trial banner on dashboard
✅ Automatic redirect for non-subscribers
✅ Sandbox/production environment switching

## Next Steps (Optional Enhancements)

- Add a subscription management page where users can:
  - View their current plan
  - See next billing date
  - Cancel subscription
  - Update payment method
- Add email notifications for:
  - Trial ending soon
  - Subscription renewed
  - Payment failed
- Add usage analytics to track:
  - Trial conversion rate
  - Churn rate
  - Active subscribers
