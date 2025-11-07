import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import connectMongo from "../../../lib/mongodb";
import User from "../../../models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Creates a Stripe Checkout session that handles payments for sellers
 * who may not have completed full onboarding yet
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    const { productInfo, sellerUserId, buyerInfo } = await request.json();

    console.log("Creating deferred payment session for:", productInfo.title);

    // Find the seller
    const seller = await User.findOne({ clerkUserId: sellerUserId });
    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    let sellerStripeAccountId = seller.stripeAccountId;

    // If seller doesn't have Express account, create minimal one automatically
    if (!sellerStripeAccountId) {
      console.log("Creating minimal Express account for seller:", seller.email);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/create-deferred-account`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: seller.clerkUserId,
              email: seller.email,
              firstName: seller.firstName,
              lastName: seller.lastName,
              country: seller.country || "US",
            }),
          }
        );

        const accountData = await response.json();

        if (response.ok && accountData.accountId) {
          sellerStripeAccountId = accountData.accountId;
          console.log(
            "Created minimal Express account:",
            sellerStripeAccountId
          );
        } else {
          throw new Error(
            `Failed to create seller account: ${accountData.error || "Unknown error"
            }`
          );
        }
      } catch (error) {
        console.error("Error creating seller account:", error);
        return NextResponse.json(
          { error: `Failed to setup seller payment account` },
          { status: 500 }
        );
      }
    }

    // Calculate platform fee (e.g., 10% of product price)
    const productAmount = Math.round(productInfo.price * 100); // Convert to cents
    const platformFeeAmount = Math.round(productAmount * 0.1); // 10% platform fee
    const sellerAmount = productAmount - platformFeeAmount;

    // Check if seller account has transfer capabilities
    let useDirectTransfer = false;
    try {
      const sellerAccount = await stripe.accounts.retrieve(
        sellerStripeAccountId
      );
      const hasTransferCapability =
        sellerAccount.capabilities?.transfers === "active";
      useDirectTransfer = hasTransferCapability;
      console.log("Seller account transfer capability:", hasTransferCapability);
    } catch (error) {
      console.log("Could not check seller capabilities");
      useDirectTransfer = false;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Create payment intent data based on account verification status
    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = useDirectTransfer
      ? {
        // VERIFIED ACCOUNT: Direct transfer to seller immediately
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        metadata: {
          platformFeeAmount: (platformFeeAmount / 100).toString(),
          sellerId: seller._id.toString(),
          sellerUserId: sellerUserId,
          productId: productInfo.id,
          onboarding_type: "deferred",
          seller_onboarded: "true",
          payment_type: "direct_transfer",
        },
      }
      : {
        // UNVERIFIED ACCOUNT: Platform holds payment
        metadata: {
          platformFeeAmount: (platformFeeAmount / 100).toString(),
          sellerId: seller._id.toString(),
          sellerUserId: sellerUserId,
          productId: productInfo.id,
          onboarding_type: "deferred",
          seller_onboarded: "false",
          payment_type: "platform_held",
          seller_amount: (sellerAmount / 100).toString(),
          platform_fee: (platformFeeAmount / 100).toString(),
          transfer_when_ready: "true", // Flag to transfer after verification
        },
      };

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productInfo.title,
              description: productInfo.description,
              images: productInfo.images || [],
            },
            unit_amount: productAmount,
          },
          quantity: 1,
        },
      ],

      payment_intent_data: paymentIntentData,

      metadata: {
        productTitle: productInfo.title,
        sellerId: seller._id.toString(),
        sellerUserId: sellerUserId,
        productId: productInfo.id,
        payment_strategy: useDirectTransfer
          ? "direct_transfer"
          : "platform_held",
      },

      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment-cancel`,

      customer_email: buyerInfo?.email,
    });

    console.log("Created deferred payment session:", session.id);
    console.log("Payment strategy:", useDirectTransfer ? "Direct transfer" : "Platform held");

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      sellerAccountId: sellerStripeAccountId,
      onboardingRequired: !seller.isStripeConnected,
      paymentStrategy: useDirectTransfer ? "direct_transfer" : "platform_held",
    });
  } catch (error) {
    console.error("Error creating deferred payment session:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment session creation failed",
      },
      { status: 500 }
    );
  }
}
