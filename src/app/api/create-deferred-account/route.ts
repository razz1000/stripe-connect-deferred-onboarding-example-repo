import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import connectMongo from "../../../lib/mongodb";
import User from "../../../models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Creates a minimal Stripe Express account for deferred onboarding
 * This allows sellers to start accepting payments immediately without full verification
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    const { userId, email, firstName, lastName, country } =
      await request.json();

    console.log("Creating deferred Express account for user:", userId);

    // Validate required fields
    if (!userId || !email || !country) {
      return NextResponse.json(
        { error: "User ID, email, and country are required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        clerkUserId: userId,
        email,
        firstName,
        lastName,
        country,
      });
    }

    let accountId = user.stripeAccountId;

    // Check if user already has a Stripe account
    if (accountId) {
      console.log("User already has Express account:", accountId);

      // Verify the account still exists in Stripe
      try {
        const existingAccount = await stripe.accounts.retrieve(accountId);
        console.log("Existing Express account verified");
        return NextResponse.json({
          accountId,
          status: "existing",
          capabilities: existingAccount.capabilities,
        });
      } catch (error) {
        console.log("Existing Express account not found, creating new one");
        accountId = null;
        user.stripeAccountId = undefined;
      }
    }

    // Create minimal Express account (deferred onboarding)
    if (!accountId) {
      console.log("Creating minimal Express account for deferred onboarding");

      const account = await stripe.accounts.create({
        type: "express",
        country: country,
        email: email,
        business_type: "individual",

        // Request minimal capabilities
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },

        // Business profile (required for Express accounts)
        business_profile: {
          product_description: "Online marketplace sales",
          mcc: "5699", // Miscellaneous specialty retail
        },

        // KEY: Set manual payouts until full onboarding complete
        settings: {
          payouts: {
            schedule: {
              interval: "manual", // Prevents automatic payouts
            },
          },
        },

        // Minimal individual info (optional but helpful)
        ...(firstName &&
          lastName && {
            individual: {
              first_name: firstName,
              last_name: lastName,
              email: email,
              address: {
                country: country,
              },
            },
          }),

        // Metadata for tracking
        metadata: {
          onboarding_type: "deferred",
          platform_user_id: userId,
        },
      });

      accountId = account.id;

      // Update user document
      user.stripeAccountId = accountId;
      user.isStripeConnected = false; // Not fully connected yet

      // Initialize deferred onboarding tracking
      user.deferredOnboarding = {
        hasMinimalAccount: true,
        pendingEarnings: 0,
        earningsCount: 0,
        onboardingNotificationSent: false,
      };

      await user.save();

      console.log("Created deferred Express account:", accountId);
    }

    return NextResponse.json({
      accountId,
      status: "created",
      requiresOnboarding: true,
      message: "Minimal account created - full onboarding required for payouts",
    });
  } catch (error) {
    console.error("Error creating deferred Express account:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
