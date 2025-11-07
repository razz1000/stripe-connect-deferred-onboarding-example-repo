import mongoose from "mongoose";

const DeferredOnboardingSchema = new mongoose.Schema({
  hasMinimalAccount: {
    type: Boolean,
    default: false,
  },
  pendingEarnings: {
    type: Number,
    default: 0,
  },
  earningsCount: {
    type: Number,
    default: 0,
  },
  onboardingNotificationSent: {
    type: Boolean,
    default: false,
  },
  lastNotificationDate: {
    type: Date,
  },
});

const UserSchema = new mongoose.Schema(
  {
    // User identification
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },

    // Location
    country: {
      type: String,
      required: true,
    },

    // Stripe Connect
    stripeAccountId: {
      type: String,
      sparse: true, // Allows multiple null values
    },
    isStripeConnected: {
      type: Boolean,
      default: false,
    },

    // Deferred onboarding tracking
    deferredOnboarding: {
      type: DeferredOnboardingSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
