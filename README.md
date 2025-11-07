# Stripe Connect Deferred Onboarding Example

This repository demonstrates the **deferred onboarding approach** for Stripe Connect, which significantly improves seller retention and reduces onboarding friction.

## What is Deferred Onboarding?

Deferred onboarding is a strategy where you:

1. **Create a minimal Stripe Express account** for sellers upfront (only requiring country)
2. **Allow sellers to start accepting payments immediately** (with manual payouts)
3. **Prompt for full onboarding later** once they've made sales and are invested

## Why Use Deferred Onboarding?

### Traditional Onboarding Problems
- Sellers must complete 10-15 minute onboarding form before making any sales
- High abandonment rate (sellers don't see immediate value)
- Sellers churn before experiencing the platform

### Deferred Onboarding Benefits
- **Reduced friction**: Only ask for country initially
- **Higher conversion**: Sellers can start selling immediately
- **Better retention**: Sellers complete full onboarding AFTER making money
- **Stronger incentive**: Once sellers have pending earnings, motivation to complete onboarding is much higher

## How It Works

### Step 1: Create Minimal Account
When a user wants to become a seller, create a minimal Stripe Express account:

```javascript
const account = await stripe.accounts.create({
  type: "express",
  country: country, // Only required field
  email: email,
  business_type: "individual",
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  settings: {
    payouts: {
      schedule: {
        interval: "manual", // Key: Manual payouts until full onboarding
      },
    },
  },
  metadata: {
    onboarding_type: "deferred",
  },
});
```

### Step 2: Accept Payments
Sellers can immediately start accepting payments. The platform holds the funds:

```javascript
// For unverified accounts, platform holds payment
const session = await stripe.checkout.sessions.create({
  // ... session config
  payment_intent_data: {
    metadata: {
      seller_amount: sellerAmount.toString(),
      payment_type: "platform_held",
      transfer_when_ready: "true",
    },
  },
});
```

### Step 3: Track Pending Earnings
Use webhooks to track seller earnings:

```javascript
// When payment succeeds
user.deferredOnboarding.pendingEarnings += sellerAmount;
user.deferredOnboarding.earningsCount += 1;

// Prompt for onboarding after threshold (e.g., 3 sales)
if (user.deferredOnboarding.earningsCount >= 3) {
  // Show onboarding prompt
}
```

### Step 4: Complete Full Onboarding
Once seller has made sales, prompt them to complete Stripe onboarding:

```javascript
const accountLink = await stripe.accountLinks.create({
  account: stripeAccountId,
  refresh_url: `${baseUrl}/dashboard`,
  return_url: `${baseUrl}/dashboard?stripeConnected=true`,
  type: "account_onboarding",
});
```

### Step 5: Transfer Funds After Verification
After onboarding is complete, transfer the held funds:

```javascript
// When account.updated webhook shows charges_enabled: true
const transfer = await stripe.transfers.create({
  amount: pendingEarnings,
  currency: "eur",
  destination: stripeAccountId,
});
```

## Implementation Guide

### Required Environment Variables

Create a `.env.local` file:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://...
```

### Key Files in This Repo

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── create-deferred-account/route.ts   # Creates minimal Express account
│   │   │   ├── create-deferred-payment/route.ts   # Payment session for sellers
│   │   │   ├── complete-onboarding/route.ts       # Generate onboarding link
│   │   │   └── webhooks/stripe/route.ts           # Handle Stripe events
│   │   ├── dashboard/page.tsx                      # Example dashboard
│   │   └── page.tsx                                # Landing/docs page
│   ├── components/
│   │   └── DashboardExample.tsx                    # Reusable dashboard component
│   ├── lib/
│   │   └── mongodb.ts                              # MongoDB connection
│   └── models/
│       └── User.ts                                 # User schema with deferred tracking
├── .env.example                                     # Environment template
├── SETUP_GUIDE.md                                   # Detailed setup instructions
├── IMPLEMENTATION_NOTES.md                          # Technical details & decisions
└── README.md                                        # This file
```

### Installation

```bash
npm install stripe mongodb mongoose
```

### Running the Example

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to see the example in action.

## Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ DEFERRED ONBOARDING FLOW                                    │
└─────────────────────────────────────────────────────────────┘

1. User wants to sell
   └──> Create minimal Express account (country only)
        └──> Account created with manual payouts

2. Buyer purchases from seller
   └──> Payment succeeds
        └──> Platform holds funds
             └──> Update seller's pending earnings

3. Seller makes 3+ sales
   └──> Show "Complete Onboarding" prompt
        └──> Strong incentive (has pending money!)

4. Seller completes Stripe onboarding
   └──> Account verified (charges_enabled: true)
        └──> Transfer all pending earnings to seller
             └──> Future payments go directly to seller
```

## Important Stripe Concepts

### Manual Payouts
- Sellers can't withdraw funds until verified
- Platform holds the money safely
- No risk to buyers or platform

### Transfer When Ready
- Store `seller_amount` in payment metadata
- When account verified, transfer accumulated funds
- Use `account.updated` webhook to detect verification

### Capabilities
- `card_payments`: Accept card payments
- `transfers`: Receive money from platform
- Both start as `pending` and become `active` after onboarding

## Testing with Stripe

1. Use Stripe test mode keys
2. Create test account with test country code
3. Complete onboarding with test data:
   - Test routing numbers
   - Test SSN: `000000000`
   - Test date of birth: Any valid date

## YouTube Video

This example is based on the tutorial: [Stripe Connect Deferred Onboarding Tutorial](https://youtube.com/...)

**Timeline:**
- 00:00 - Why deferred onboarding improves retention
- 02:05 - Stripe Connect documentation
- 03:59 - Implementation example
- 07:22 - Webhook setup
- 13:14 - Testing the flow

## Additional Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Account Capabilities](https://stripe.com/docs/connect/account-capabilities)

## Questions?

If you have questions about implementing deferred onboarding, please open an issue or reach out!

For direct inquiries, contact: [rasmus@speedbuildmarketplace.com](mailto:rasmus@speedbuildmarketplace.com)

## Related Projects

- **[Speed Build Marketplace](https://speedbuildmarketplace.com)** - Complete marketplace boilerplate with Stripe Connect integration
- **[Prometora](https://prometora.com)** - Prompt your marketplace fast

## License

MIT
