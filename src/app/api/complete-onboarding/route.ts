import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Creates an Account Link for sellers to complete their full Stripe onboarding
 * This is called after a seller has made sales and wants to access their earnings
 */
export async function POST(request: NextRequest) {
  try {
    const { stripeAccountId } = await request.json();

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Stripe account ID is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/dashboard?onboarding=refresh`,
      return_url: `${baseUrl}/dashboard?onboarding=complete`,
      type: "account_onboarding",
    });

    console.log("Created account onboarding link for:", stripeAccountId);

    return NextResponse.json({
      url: accountLink.url,
    });
  } catch (error) {
    console.error("Error creating account link:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create onboarding link",
      },
      { status: 500 }
    );
  }
}
