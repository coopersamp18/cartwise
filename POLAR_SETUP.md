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
```

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

## Troubleshooting

### Webhook Not Receiving Events

- Verify your webhook URL is publicly accessible
- Check that the webhook secret matches your environment variable
- Review webhook delivery logs in Polar dashboard
- Check your application logs for any errors

### Subscription Not Created

- Check the webhook payload in Polar dashboard
- Verify the `user_id` is being passed in the checkout metadata
- Check your Supabase logs for any RLS policy issues
- Ensure the `subscriptions` table exists and has proper permissions

### Users Can't Access Dashboard

- Verify the subscription record exists in Supabase
- Check that the subscription status is either "trial" or "active"
- Verify the trial_ends_at or current_period_end dates are in the future
- Check middleware logs for any errors

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
✅ Polar checkout API endpoint
✅ Webhook handler for Polar events
✅ Subscription signup page
✅ Success page with status checking
✅ Auth callback with subscription check
✅ Middleware protection for routes
✅ Trial banner on dashboard
✅ Automatic redirect for non-subscribers

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
