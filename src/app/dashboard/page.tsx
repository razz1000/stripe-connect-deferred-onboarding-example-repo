import DashboardExample from "../../components/DashboardExample";

export default function DashboardPage() {
  // In a real app, you would fetch this from your database based on logged-in user
  const mockUserData = {
    stripeAccountId: "acct_example123",
    isStripeConnected: false,
    deferredOnboarding: {
      hasMinimalAccount: true,
      pendingEarnings: 127.5,
      earningsCount: 4,
      onboardingNotificationSent: false,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <DashboardExample
          stripeAccountId={mockUserData.stripeAccountId}
          isStripeConnected={mockUserData.isStripeConnected}
          deferredOnboarding={mockUserData.deferredOnboarding}
        />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Example Dashboard
          </h3>
          <p className="text-blue-800 text-sm">
            This is a mock dashboard showing the deferred onboarding flow. In a
            real application, you would fetch the user's data from your database
            and display their actual pending earnings and account status.
          </p>
        </div>
      </div>
    </div>
  );
}
