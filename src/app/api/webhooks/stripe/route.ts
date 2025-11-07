import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import connectMongo from "../../../../lib/mongodb";
import User from "../../../../models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder";

/**
 * Stripe Webhook Handler for Deferred Onboarding
 *
 * Key Events:
 * 1. checkout.session.completed - Track pending earnings for unverified sellers
 * 2. account.updated - Detect when seller completes onboarding, transfer pending funds
 * 3. transfer.created - Log successful transfers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;

      case "transfer.created":
        console.log("Transfer created:", event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 * If seller is unverified, track pending earnings
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("Processing checkout session:", session.id);

  const paymentIntent = await stripe.paymentIntents.retrieve(
    session.payment_intent as string
  );

  const metadata = paymentIntent.metadata;
  const paymentType = metadata.payment_type;

  console.log("Payment type:", paymentType);

  // If payment is held by platform (seller not fully onboarded)
  if (paymentType === "platform_held") {
    const sellerUserId = metadata.sellerUserId;
    const sellerAmount = parseFloat(metadata.seller_amount || "0");

    console.log(`Platform holding ${sellerAmount} for seller ${sellerUserId}`);

    // Update seller's pending earnings
    const seller = await User.findOne({ clerkUserId: sellerUserId });

    if (seller) {
      seller.deferredOnboarding = {
        ...seller.deferredOnboarding,
        pendingEarnings:
          (seller.deferredOnboarding?.pendingEarnings || 0) + sellerAmount,
        earningsCount: (seller.deferredOnboarding?.earningsCount || 0) + 1,
      };

      await seller.save();

      console.log(
        `Updated seller pending earnings: $${seller.deferredOnboarding.pendingEarnings}, ` +
        `Total sales: ${seller.deferredOnboarding.earningsCount}`
      );

      // Send notification if seller has reached threshold (e.g., 3 sales)
      if (
        seller.deferredOnboarding.earningsCount >= 3 &&
        !seller.deferredOnboarding.onboardingNotificationSent
      ) {
        console.log(
          `Seller ${sellerUserId} has reached threshold, should send onboarding notification`
        );

        // Mark notification as sent
        seller.deferredOnboarding.onboardingNotificationSent = true;
        seller.deferredOnboarding.lastNotificationDate = new Date();
        await seller.save();

        // TODO: Send email/notification to seller to complete onboarding
        // Example: await sendOnboardingReminderEmail(seller.email, seller.deferredOnboarding.pendingEarnings);
      }
    }
  } else if (paymentType === "direct_transfer") {
    console.log("Payment directly transferred to verified seller");
  }
}

/**
 * Handle account verification completion
 * Transfer all pending earnings to the now-verified seller
 */
async function handleAccountUpdated(account: Stripe.Account) {
  console.log("Account updated:", account.id);

  // Check if account just became fully verified
  const isFullyVerified =
    account.charges_enabled === true &&
    account.capabilities?.transfers === "active";

  if (!isFullyVerified) {
    console.log("Account not fully verified yet");
    return;
  }

  console.log("Account is now fully verified:", account.id);

  // Find seller by Stripe account ID
  const seller = await User.findOne({ stripeAccountId: account.id });

  if (!seller) {
    console.log("No seller found for account:", account.id);
    return;
  }

  // Check if seller has pending earnings to transfer
  const pendingEarnings = seller.deferredOnboarding?.pendingEarnings || 0;

  if (pendingEarnings <= 0) {
    console.log("No pending earnings to transfer");

    // Mark as connected even if no pending earnings
    seller.isStripeConnected = true;
    await seller.save();
    return;
  }

  console.log(
    `Transferring pending earnings: $${pendingEarnings} to ${account.id}`
  );

  try {
    // Transfer pending earnings to seller
    const transfer = await stripe.transfers.create({
      amount: Math.round(pendingEarnings * 100), // Convert to cents
      currency: "usd",
      destination: account.id,
      description: `Transfer of pending earnings from ${seller.deferredOnboarding.earningsCount} sales`,
      metadata: {
        seller_user_id: seller.clerkUserId,
        seller_id: seller._id.toString(),
        earnings_count: seller.deferredOnboarding.earningsCount.toString(),
        onboarding_type: "deferred_completion",
      },
    });

    console.log("Transfer successful:", transfer.id);

    // Update seller record
    seller.isStripeConnected = true;
    seller.deferredOnboarding.pendingEarnings = 0; // Clear pending earnings
    // Keep earningsCount for historical tracking

    // Update payout schedule to automatic now that they're verified
    await stripe.accounts.update(account.id, {
      settings: {
        payouts: {
          schedule: {
            interval: "daily", // Change from manual to automatic
          },
        },
      },
    });

    await seller.save();

    console.log(
      `Successfully transferred ${pendingEarnings} to seller ${seller.clerkUserId}`
    );

    // TODO: Send confirmation email to seller
    // Example: await sendTransferConfirmationEmail(seller.email, pendingEarnings, transfer.id);
  } catch (error) {
    console.error("Error transferring pending earnings:", error);
    // TODO: Log error and retry later
  }
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};
