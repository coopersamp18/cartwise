# Webhook Debugging Guide

## Issue Identified: Missing customer_id in webhook events

### Root Cause
The Polar SDK's `validateEvent()` function was returning a typed object that didn't include all fields from the webhook payload. Specifically, `customer_id` was being stripped or not properly parsed, causing it to be `undefined` in the event handlers.

### Solution
Changed the webhook handler to:
1. Use `validateEvent()` only for signature verification (security)
2. Parse the raw request body with `JSON.parse()` to get the complete event data

This ensures all fields from Polar's webhook payload are available, including:
- `customer_id`
- `current_period_end`
- All other subscription fields

### Code Changes Made

**Before:**
```typescript
event = validateEvent(body, headers, webhookSecret);
```

**After:**
```typescript
// Validate the signature
validateEvent(body, headers, webhookSecret);

// Parse the body directly to ensure we get all fields
event = JSON.parse(body);
```

## How to Diagnose Failed Webhooks

### 1. Check the Polar Dashboard
- Go to your Polar dashboard → Deliveries
- Failed webhooks will show "Failed" status
- Click on the webhook to see:
  - Full payload
  - Response status code
  - Error message (if any)

### 2. Check Your Server Logs
Look for these log entries in your terminal:

```
Webhook environment: { useSandbox: true, hasSecret: true }
Received Polar webhook: { type: 'subscription.created', ... }
Processing subscription.created: { userId, customerId, subscriptionId, ... }
```

### 3. Common Issues to Check

#### Missing customer_id
**Symptom:** Logs show `customerId: undefined`
**Solution:** Ensure you're parsing the raw JSON body, not just using the SDK's typed response

#### Missing user_id in metadata
**Symptom:** Error "Missing user_id in metadata"
**Solution:** Ensure you're passing `user_id` in the checkout metadata when creating the checkout

#### Database errors
**Symptom:** Error creating/updating subscription in database
**Solution:** Check:
- User exists in the database
- Subscription table schema matches the data being inserted
- RLS policies allow service role to write

#### Signature verification failures
**Symptom:** "Invalid webhook signature" error
**Solution:** Check:
- Webhook secret is correct for the environment (sandbox vs production)
- Using the right environment variables
- Webhook secret hasn't been rotated in Polar dashboard

### 4. Enhanced Error Logging

The webhook handler now includes detailed error logging:

```typescript
console.error("Error creating subscription:", {
  error: upsertError,
  userId,
  subscriptionId,
  customerId,
  status: mappedStatus,
});
```

This helps identify exactly what data was being processed when an error occurred.

### 5. Testing Webhooks Locally

To test webhooks locally:

1. **Use Polar's webhook testing tool** in the dashboard
2. **Use ngrok or similar** to expose your local server:
   ```bash
   ngrok http 3000
   ```
3. **Update webhook URL** in Polar dashboard to your ngrok URL
4. **Trigger events** by creating test subscriptions

### 6. Webhook Event Flow

Understanding the typical event sequence:

1. `checkout.created` - User starts checkout
2. `checkout.updated` (multiple) - User fills in details
3. `customer.created` - Customer record created
4. `customer.state_changed` - Customer state updates
5. `subscription.created` - **Critical: Creates subscription record**
6. `subscription.updated` - Subscription details updated
7. `subscription.active` - **Critical: Activates subscription**
8. `order.created` - Order record created
9. `order.paid` - Payment processed

### 7. Monitoring Best Practices

1. **Set up alerts** for failed webhooks
2. **Log all webhook events** with full context
3. **Return 200 quickly** - do heavy processing async if needed
4. **Implement idempotency** - webhooks may be retried
5. **Handle all event types** - even if you just log them

## Webhook Retry Behavior

Polar will retry failed webhooks:
- Immediately
- After 5 minutes
- After 30 minutes
- After 2 hours
- After 6 hours
- After 12 hours

Make sure your webhook handler is idempotent to handle retries gracefully.

## Current Webhook Status

After the fix:
- ✅ `customer_id` is now properly captured
- ✅ All subscription events properly update the database
- ✅ Better error logging for debugging
- ✅ Proper error responses (500 status) for database failures
