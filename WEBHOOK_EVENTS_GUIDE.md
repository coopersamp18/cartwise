# Polar Webhook Events - Implementation Guide

This document explains how Cartwise handles Polar webhook events for subscription management.

## ✅ Implemented Event Handlers

### 1. `subscription.created` (Primary Event)
**When it fires**: A new subscription is created after checkout completion

**What it does**:
- Creates the initial subscription record in Supabase
- Extracts `user_id` from metadata (passed during checkout)
- Stores `polar_customer_id` and `polar_subscription_id`
- Maps Polar status to database status
- Sets trial end date (3 days) if status is "trialing"

**Key fields captured**:
```typescript
{
  user_id: event.data.metadata.user_id,
  polar_customer_id: event.data.customer_id,
  polar_subscription_id: event.data.id,
  status: "trial" | "active" | "inactive",
  trial_ends_at: Date (if trialing),
  current_period_end: Date
}
```

**Why this is critical**: This is the ONLY event that contains your custom metadata (user_id). Without handling this event, you can't link the Polar subscription to your user.

---

### 2. `subscription.active`
**When it fires**: Subscription becomes active (after trial ends or immediate payment)

**What it does**:
- Updates subscription status to "active"
- Ensures `polar_customer_id` is set (backup)
- Updates `current_period_end`

**Use case**: Trial converts to paid, or immediate paid subscription starts

---

### 3. `subscription.updated`
**When it fires**: Any subscription detail changes (status, payment method, etc.)

**What it does**:
- Updates subscription status based on Polar's status
- Ensures `polar_customer_id` is always set
- Updates `current_period_end`

**Status mapping**:
- `trialing` → `trial`
- `active` → `active`
- `past_due` → `past_due`
- `unpaid` → `unpaid`
- `canceled` → `canceled`
- Other → `inactive`

**Use case**: Payment failures, plan changes, status transitions

---

### 4. `subscription.canceled`
**When it fires**: User cancels their subscription

**What it does**:
- Updates status to "canceled"
- Keeps `current_period_end` so user retains access until period ends

**Important**: Canceled ≠ Revoked. User still has access until `current_period_end`.

---

### 5. `subscription.revoked`
**When it fires**: Subscription is immediately terminated (fraud, payment failure, etc.)

**What it does**:
- Updates status to "revoked"
- Clears `current_period_end` (access ends immediately)

**Important**: Revoked = immediate loss of access. User cannot access dashboard.

---

## Event Flow Example

### New Subscription Flow
```
1. User clicks "Start Free Trial"
   ↓
2. Checkout created (checkout.created)
   ↓
3. User enters payment info (checkout.updated × N)
   ↓
4. User completes checkout
   ↓
5. Customer record created (customer.created)
   ↓
6. 🎯 SUBSCRIPTION CREATED (subscription.created)
   → Creates subscription record with customer_id + subscription_id
   ↓
7. Subscription becomes active (subscription.active)
   → Updates status to "active"
   ↓
8. Subscription status updated (subscription.updated)
   → Updates to "trialing" status
   ↓
9. Order processed (order.created, order.paid)
   ↓
10. Benefits granted (benefit_grant.created)
```

### Cancellation Flow
```
1. User cancels subscription
   ↓
2. subscription.canceled event fires
   → Status updated to "canceled"
   → current_period_end retained
   ↓
3. User still has access until current_period_end
   ↓
4. After period ends, middleware blocks access
```

### Revocation Flow (Immediate Termination)
```
1. Payment fails repeatedly / Fraud detected
   ↓
2. subscription.revoked event fires
   → Status updated to "revoked"
   → current_period_end cleared
   ↓
3. User immediately loses access
```

---

## Database Schema

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,           -- Links to auth.users
  polar_customer_id TEXT,                 -- From event.data.customer_id
  polar_subscription_id TEXT,             -- From event.data.id
  status TEXT NOT NULL,                   -- trial, active, canceled, revoked, etc.
  trial_ends_at TIMESTAMP,                -- When trial ends
  current_period_end TIMESTAMP,           -- When current billing period ends
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Status Definitions

| Status | Meaning | User Access | Notes |
|--------|---------|-------------|-------|
| `trial` | Free trial active | ✅ Yes | Until `trial_ends_at` |
| `active` | Paid subscription active | ✅ Yes | Until `current_period_end` |
| `canceled` | Canceled but not expired | ✅ Yes | Until `current_period_end` |
| `past_due` | Payment failed, grace period | ⚠️ Maybe | Configure in middleware |
| `unpaid` | Payment failed, no grace | ❌ No | |
| `revoked` | Immediately terminated | ❌ No | No grace period |
| `inactive` | No subscription | ❌ No | |

---

## Middleware Logic

The middleware (`middleware.ts`) checks subscription status:

```typescript
// User has access if:
- status === "trial" AND trial_ends_at > NOW()
- status === "active" AND current_period_end > NOW()
- status === "canceled" AND current_period_end > NOW() (grace period)

// User blocked if:
- status === "revoked"
- status === "unpaid"
- status === "inactive"
- trial/period has expired
```

---

## Debugging Webhook Issues

### Check Logs
Look for these log messages in your terminal:

```
✅ "Successfully created subscription:" - subscription.created worked
✅ "Successfully updated subscription to active:" - subscription.active worked
✅ "Successfully updated subscription:" - subscription.updated worked
❌ "No user_id in subscription metadata" - metadata not passed correctly
❌ "Error creating subscription:" - Database error
```

### Common Issues

**Issue**: `polar_customer_id` and `polar_subscription_id` are NULL
- **Cause**: `subscription.created` event not handled
- **Fix**: Ensure `subscription.created` case exists in webhook handler

**Issue**: Subscription not created at all
- **Cause**: `user_id` not in metadata
- **Fix**: Verify checkout creation includes metadata:
  ```typescript
  metadata: {
    user_id: user.id,
    user_email: email
  }
  ```

**Issue**: Subscription exists but status wrong
- **Cause**: Status mapping incorrect
- **Fix**: Check `subscription.updated` handler status mapping

---

## Testing Checklist

### Test New Subscription
1. ✅ Start checkout
2. ✅ Complete payment with test card (4242 4242 4242 4242)
3. ✅ Check logs for "Successfully created subscription"
4. ✅ Verify in Supabase:
   - `user_id` is set
   - `polar_customer_id` is set
   - `polar_subscription_id` is set
   - `status` is "trial" or "active"
   - `trial_ends_at` or `current_period_end` is set

### Test Cancellation
1. ✅ Cancel subscription in Polar dashboard
2. ✅ Check logs for "Successfully updated subscription to canceled"
3. ✅ Verify status is "canceled" but `current_period_end` is still set
4. ✅ Confirm user still has access until period ends

### Test Revocation
1. ✅ Revoke subscription in Polar dashboard
2. ✅ Check logs for "Successfully updated subscription to revoked"
3. ✅ Verify status is "revoked" and `current_period_end` is NULL
4. ✅ Confirm user immediately loses access

---

## Webhook Configuration

### Polar Dashboard Setup
1. Go to Settings → Webhooks
2. Add endpoint: `https://yourdomain.com/api/polar/webhook`
3. Select events:
   - ✅ `subscription.created`
   - ✅ `subscription.active`
   - ✅ `subscription.updated`
   - ✅ `subscription.canceled`
   - ✅ `subscription.revoked`
4. Copy webhook secret to `.env.local`

### Environment Variables
```bash
POLAR_WEBHOOK_SECRET=whsec_your_secret_here
POLAR_SANDBOX_WEBHOOK_SECRET=whsec_sandbox_secret_here
POLAR_USE_SANDBOX=true  # or false for production
```

---

## Summary

**Critical Events** (Must Handle):
1. ✅ `subscription.created` - Creates subscription record
2. ✅ `subscription.active` - Activates subscription
3. ✅ `subscription.updated` - Updates subscription details
4. ✅ `subscription.canceled` - Handles cancellation
5. ✅ `subscription.revoked` - Handles immediate termination

**Key Points**:
- `subscription.created` is the ONLY event with your metadata (user_id)
- Always extract `customer_id` and `subscription_id` from event.data
- Map Polar statuses to your database statuses
- Handle both graceful (canceled) and immediate (revoked) termination
- Keep `current_period_end` for canceled subscriptions (grace period)

---

## Resources

- [Polar Webhook Events Documentation](https://docs.polar.sh/integrate/webhooks/events)
- [Polar API Reference](https://docs.polar.sh/api-reference)
- [Polar TypeScript SDK](https://github.com/polarsource/polar-js)
