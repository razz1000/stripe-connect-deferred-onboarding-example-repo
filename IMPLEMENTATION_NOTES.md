# Implementation Notes - Deferred Onboarding

This document explains the key implementation details and decisions for the deferred onboarding approach.

## Core Concept

The deferred onboarding strategy allows sellers to start accepting payments **before** completing full Stripe verification. This dramatically improves conversion rates by reducing upfront friction.

## Key Implementation Details

### 1. Manual Payouts

When creating the minimal Express account, we set payouts to `manual`:

```typescript
settings: {
  payouts: {
    schedule: {
      interval: "manual", // Prevents automatic payouts
    },
  },
}
```

**Why?** This ensures sellers cannot withdraw funds until they complete full verification. The platform safely holds the money.

### 2. Platform-Held Payments

For unverified sellers, payments are held by the platform account:

```typescript
// For unverified accounts
payment_intent_data: {
  metadata: {
    payment_type: "platform_held",
    seller_amount: "45.00",
    transfer_when_ready: "true",
  },
}
```

**Important:** No `transfer_data` or `application_fee_amount` for unverified accounts. The platform receives the full payment and tracks what belongs to the seller in the database.

### 3. Verified Seller Payments

Once verified, payments go directly to the seller:

```typescript
// For verified accounts
payment_intent_data: {
  application_fee_amount: platformFeeAmount,
  transfer_data: {
    destination: sellerStripeAccountId,
  },
}
```

**Why?** This is more efficient and the seller gets paid immediately.

### 4. Tracking Pending Earnings

The database schema tracks pending earnings:

```typescript
deferredOnboarding: {
  hasMinimalAccount: true,
  pendingEarnings: 127.50,      // Total USD owed to seller
  earningsCount: 4,              // Number of sales
  onboardingNotificationSent: false,
  lastNotificationDate: Date
}
```

### 5. Webhook Flow

**checkout.session.completed:**
- Check if payment is "platform_held"
- Update seller's `pendingEarnings` and `earningsCount`
- If `earningsCount >= 3`, trigger onboarding notification

**account.updated:**
- Check if `charges_enabled === true` and `transfers === "active"`
- Transfer all `pendingEarnings` to seller
- Update payout schedule from `manual` to `daily`
- Mark seller as `isStripeConnected: true`

### 6. Transfer After Verification

When seller completes onboarding:

```typescript
const transfer = await stripe.transfers.create({
  amount: Math.round(pendingEarnings * 100),
  currency: "usd",
  destination: sellerStripeAccountId,
  description: `Transfer of pending earnings from ${earningsCount} sales`,
});
```

## Decision Points

### When to Prompt for Onboarding?

**Option 1: After N sales (Recommended)**
```typescript
if (earningsCount >= 3 && !onboardingNotificationSent) {
  // Show onboarding prompt
}
```

**Option 2: After $ threshold**
```typescript
if (pendingEarnings >= 100 && !onboardingNotificationSent) {
  // Show onboarding prompt
}
```

**Option 3: Time-based**
```typescript
if (daysSinceFirstSale >= 7 && pendingEarnings > 0) {
  // Show onboarding prompt
}
```

We recommend **Option 1** (after 3 sales) as it provides:
- Clear milestone for sellers
- Enough data to prove platform value
- Not too high a barrier

### Currency Considerations

This example uses USD. For multi-currency:

1. Store earnings in seller's local currency
2. Track currency in metadata:
```typescript
metadata: {
  seller_amount: "45.00",
  seller_currency: "eur",
}
```

3. Transfer in correct currency:
```typescript
const transfer = await stripe.transfers.create({
  amount: pendingEarnings,
  currency: seller.country === "US" ? "usd" : "eur",
  destination: sellerStripeAccountId,
});
```

### Platform Fee Structure

This example uses a 10% platform fee:

```typescript
const platformFeeAmount = Math.round(productAmount * 0.1);
const sellerAmount = productAmount - platformFeeAmount;
```

**For verified accounts:** Fee is taken via `application_fee_amount`

**For unverified accounts:** Fee is implicit (platform holds full payment, tracks seller's portion separately)

## Security Considerations

### 1. Validate Account Ownership

Always verify the user owns the Stripe account:

```typescript
const user = await User.findOne({
  clerkUserId: userId,
  stripeAccountId: accountId
});
```

### 2. Idempotency

Stripe transfers should be idempotent:

```typescript
const transfer = await stripe.transfers.create({
  amount: pendingEarnings,
  destination: accountId,
}, {
  idempotencyKey: `transfer_${userId}_${Date.now()}`
});
```

### 3. Verify Webhook Signatures

Always verify webhooks are from Stripe:

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

## Testing Strategy

### 1. Unit Tests

Test the logic for:
- Calculating platform fees
- Determining payment strategy (direct vs held)
- Updating pending earnings

### 2. Integration Tests

Test the full flow:
1. Create minimal account
2. Make payment (verify held by platform)
3. Simulate account verification webhook
4. Verify transfer created
5. Verify seller marked as connected

### 3. Stripe Test Mode

Use Stripe test cards and test accounts:
- Complete onboarding with test data
- Use webhooks in test mode
- Verify test transfers

## Common Issues

### Issue: Transfer Fails After Onboarding

**Cause:** Seller account not fully verified

**Solution:** Check account capabilities:
```typescript
const account = await stripe.accounts.retrieve(accountId);
console.log(account.capabilities); // Must be 'active'
console.log(account.charges_enabled); // Must be true
```

### Issue: Payments Not Tracked

**Cause:** Webhook not firing or metadata missing

**Solution:**
1. Ensure webhook endpoint is accessible
2. Verify metadata is set correctly on payment
3. Check webhook logs in Stripe Dashboard

### Issue: Duplicate Transfers

**Cause:** Webhook fired multiple times

**Solution:**
1. Use idempotency keys
2. Check if transfer already made:
```typescript
if (seller.deferredOnboarding.pendingEarnings <= 0) {
  return; // Already transferred
}
```

## Scaling Considerations

### 1. Batch Transfers

For high-volume platforms, batch transfers:

```typescript
// Run daily cron job
const verifiedSellers = await User.find({
  isStripeConnected: true,
  'deferredOnboarding.pendingEarnings': { $gt: 0 }
});

for (const seller of verifiedSellers) {
  await createTransfer(seller);
}
```

### 2. Queue System

Use a job queue (Bull, BullMQ) for transfers:

```typescript
// In webhook
await transferQueue.add('transfer-earnings', {
  sellerId: seller._id,
  amount: pendingEarnings
});
```

### 3. Monitoring

Track key metrics:
- % of sellers who complete onboarding
- Average time to complete onboarding
- Average earnings before onboarding
- Failed transfer rate

## Future Enhancements

1. **Email Notifications**: Send automated emails when sellers reach thresholds
2. **SMS Alerts**: Notify sellers of pending earnings via SMS
3. **Progressive Disclosure**: Ask for minimal info first, more later
4. **In-App Onboarding**: Embed Stripe onboarding in your app
5. **Earnings Dashboard**: Show detailed breakdown of pending earnings

## Additional Resources

- [Stripe Connect Best Practices](https://stripe.com/docs/connect/best-practices)
- [Destination Charges](https://stripe.com/docs/connect/destination-charges)
- [Separate Charges and Transfers](https://stripe.com/docs/connect/separate-charges-and-transfers)
- [Account Capabilities](https://stripe.com/docs/connect/account-capabilities)

## Support

For implementation help:
- Stripe Support: [support.stripe.com](https://support.stripe.com)
- Stripe Discord: [discord.gg/stripe](https://discord.gg/stripe)
- GitHub Issues: [Link to your repo]
