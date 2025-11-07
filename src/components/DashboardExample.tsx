"use client";

import { useState } from "react";

interface DeferredOnboarding {
  hasMinimalAccount: boolean;
  pendingEarnings: number;
  earningsCount: number;
  onboardingNotificationSent: boolean;
}

interface DashboardExampleProps {
  stripeAccountId?: string;
  isStripeConnected: boolean;
  deferredOnboarding?: DeferredOnboarding;
}

/**
 * Example Dashboard Component
 * Shows pending earnings and prompts seller to complete onboarding
 */
export default function DashboardExample({
  stripeAccountId,
  isStripeConnected,
  deferredOnboarding,
}: DashboardExampleProps) {
  const [loading, setLoading] = useState(false);

  const handleCompleteOnboarding = async () => {
    if (!stripeAccountId) return;

    setLoading(true);
    try {
      const response = await fetch("/api/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeAccountId }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        alert("Failed to create onboarding link");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // If no minimal account, show "Become a Seller" prompt
  if (!deferredOnboarding?.hasMinimalAccount) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Start Selling Today
        </h2>
        <p className="text-gray-700 mb-4">
          Create your seller account and start accepting payments in minutes.
        </p>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Become a Seller
        </button>
      </div>
    );
  }

  // If seller has pending earnings, show prominent onboarding prompt
  if (!isStripeConnected && deferredOnboarding.earningsCount >= 3) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-8 border-2 border-green-500">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-12 w-12 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              You have ${deferredOnboarding.pendingEarnings.toFixed(2)} waiting!
            </h3>
            <p className="text-gray-700 mb-4">
              Complete your seller verification to access your earnings from{" "}
              {deferredOnboarding.earningsCount} sales.
            </p>
            <button
              onClick={handleCompleteOnboarding}
              disabled={loading}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Complete Verification & Get Paid"}
            </button>
            <p className="text-sm text-gray-600 mt-3">
              Takes about 5-10 minutes. You'll need your tax ID and bank account
              details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If seller has minimal account but not enough sales yet
  if (!isStripeConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Your Seller Dashboard
        </h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-800">
            <strong>Pending Earnings:</strong> $
            {deferredOnboarding?.pendingEarnings.toFixed(2) || "0.00"}
          </p>
          <p className="text-yellow-800 text-sm mt-1">
            From {deferredOnboarding?.earningsCount || 0} sales
          </p>
        </div>
        <p className="text-gray-700 mb-4">
          You can complete your verification now, or wait until you have more
          sales.
        </p>
        <button
          onClick={handleCompleteOnboarding}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Complete Verification"}
        </button>
      </div>
    );
  }

  // Fully verified seller
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <svg
          className="h-6 w-6 text-green-600 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="text-xl font-bold text-gray-900">
          Your Seller Account is Active
        </h2>
      </div>
      <p className="text-gray-700 mb-4">
        You can now receive payments directly to your account. Payouts are
        processed automatically.
      </p>
      <div className="bg-gray-50 rounded p-4">
        <p className="text-sm text-gray-600">
          Total Sales: {deferredOnboarding?.earningsCount || 0}
        </p>
      </div>
    </div>
  );
}
