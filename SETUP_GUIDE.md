# Setup Guide - Stripe Connect Deferred Onboarding

This guide walks you through setting up the deferred onboarding example from scratch.

## Prerequisites

- Node.js 18+ installed
- MongoDB installed locally OR MongoDB Atlas account
- Stripe account (test mode)
- Stripe CLI (for webhook testing)

## Step 1: Clone and Install

```bash
git clone https://github.com/yourusername/stripe-connect-deferred-onboarding-example-repo.git
cd stripe-connect-deferred-onboarding-example-repo
npm install
```

## Step 2: Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Get your Stripe keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - Go to Developers → API keys
   - Copy your "Secret key" (starts with `sk_test_`)

3. Update `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
STRIPE_WEBHOOK_SECRET=whsec_we_will_get_this_in_step_4
NEXT_PUBLIC_BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/stripe-deferred-onboarding
```

## Step 3: Set Up MongoDB

### Option A: Local MongoDB

1. Install MongoDB:
```bash
# macOS
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Windows - Download from mongodb.com
```

2. Start MongoDB:
```bash
mongod --dbpath=/path/to/data
```

3. Your connection string is:
```
mongodb://localhost:27017/stripe-deferred-onboarding
```

### Option B: MongoDB Atlas (Cloud)

1. Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Get connection string from "Connect" button
4. Update `MONGODB_URI` in `.env.local`:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/stripe-deferred-onboarding
```

## Step 4: Set Up Stripe Webhooks

### For Local Development

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows/Linux - Download from https://stripe.com/docs/stripe-cli
```

2. Login to Stripe CLI:
```bash
stripe login
```

3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### For Production

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `account.updated`
   - `transfer.created`
5. Copy the webhook signing secret and add to your production environment variables

## Step 5: Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the example!

## Testing the Flow

### Test 1: Create Minimal Account

```bash
curl -X POST http://localhost:3000/api/create-deferred-account \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "email": "seller@example.com",
    "firstName": "Test",
    "lastName": "Seller",
    "country": "US"
  }'
```

Expected response:
```json
{
  "accountId": "acct_xxxxx",
  "status": "created",
  "requiresOnboarding": true,
  "message": "Minimal account created - full onboarding required for payouts"
}
```

### Test 2: Create Payment

```bash
curl -X POST http://localhost:3000/api/create-deferred-payment \
  -H "Content-Type: application/json" \
  -d '{
    "productInfo": {
      "id": "prod_123",
      "title": "Test Product",
      "description": "Test Description",
      "price": 50.00
    },
    "sellerUserId": "test_user_123",
    "buyerInfo": {
      "email": "buyer@example.com"
    }
  }'
```

Expected response:
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_xxxxx",
  "sellerAccountId": "acct_xxxxx",
  "onboardingRequired": true,
  "paymentStrategy": "platform_held"
}
```

### Test 3: Complete a Test Payment

1. Click the `url` from Test 2 response
2. Use Stripe test card: `4242 4242 4242 4242`
3. Any future expiry date, any CVC, any ZIP
4. Complete the checkout

### Test 4: Check Webhook Events

In your Stripe CLI terminal, you should see:
```
✅ Received event: checkout.session.completed
```

Check your MongoDB - the seller's `pendingEarnings` should be updated!

### Test 5: Trigger Stripe Onboarding

You can manually test the account onboarding by using the Stripe CLI:

```bash
# Simulate account verification
stripe trigger account.updated
```

Or complete full onboarding via:
1. Create an account link for the seller's Stripe account
2. Use test data to complete onboarding
3. Webhook will automatically transfer pending earnings

## Stripe Test Data

When testing Stripe onboarding, use these test values:

### Test Cards
- Successful payment: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined card: `4000 0000 0000 9995`

### Test Identity Data
- SSN/Tax ID: `000000000`
- Phone: `0000000000`
- Date of Birth: Any date at least 18 years ago
- Bank Account (US): Routing `110000000`, Account `000123456789`

### Test Countries
Some popular countries for testing:
- US: Requires SSN, bank account
- GB: Requires National Insurance number
- DE: Requires Tax ID
- AU: Requires ABN

## Troubleshooting

### MongoDB Connection Issues

**Error:** `MongooseError: Connection failed`

Solution:
1. Ensure MongoDB is running: `mongod`
2. Check your connection string in `.env.local`
3. For Atlas, check IP whitelist and credentials

### Stripe Webhook Not Firing

**Error:** Webhooks not being received

Solution:
1. Ensure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Check that `STRIPE_WEBHOOK_SECRET` matches the CLI output
3. Check Next.js server logs for errors

### Account Creation Fails

**Error:** `Failed to create seller account`

Solution:
1. Verify `STRIPE_SECRET_KEY` is correct
2. Check Stripe Dashboard for error details
3. Ensure country code is valid (e.g., "US", "GB", "DE")

### Transfer Fails After Onboarding

**Error:** `Transfer failed`

Solution:
1. Ensure seller account is fully verified (`charges_enabled: true`)
2. Check that `pendingEarnings` > 0
3. Verify platform has sufficient balance (in test mode, use Stripe CLI to add test balance)

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── create-deferred-account/    # Create minimal Express account
│   │   │   │   └── route.ts
│   │   │   ├── create-deferred-payment/    # Handle payments for sellers
│   │   │   │   └── route.ts
│   │   │   └── webhooks/
│   │   │       └── stripe/                 # Process Stripe events
│   │   │           └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                        # Landing page with docs
│   ├── lib/
│   │   └── mongodb.ts                      # MongoDB connection utility
│   └── models/
│       └── User.ts                         # User/Seller schema
├── .env.example                            # Environment variables template
├── .env.local                              # Your local environment (git ignored)
├── package.json
├── README.md                               # Overview and concept explanation
└── SETUP_GUIDE.md                          # This file
```

## Next Steps

Once you have the example running:

1. Explore the API routes to understand the implementation
2. Check the webhook handler to see how pending earnings are tracked
3. Review the User model to see the deferred onboarding schema
4. Customize the flow for your specific marketplace needs
5. Add email notifications for sellers when they reach earning thresholds
6. Build a dashboard UI to show sellers their pending earnings

## Additional Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Account Capabilities](https://stripe.com/docs/connect/account-capabilities)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Next.js App Router](https://nextjs.org/docs/app)

## Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/yourusername/stripe-connect-deferred-onboarding-example-repo/issues)
2. Watch the [YouTube Tutorial](https://youtube.com/...)
3. Review [Stripe Connect Documentation](https://stripe.com/docs/connect)

## License

MIT
