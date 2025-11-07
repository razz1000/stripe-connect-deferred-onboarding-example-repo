export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Stripe Connect Deferred Onboarding Example
          </h1>
          <p className="text-xl text-gray-600">
            Reduce seller friction and improve retention with deferred onboarding
          </p>
        </div>

        {/* What is Deferred Onboarding */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            What is Deferred Onboarding?
          </h2>
          <p className="text-gray-700 mb-4">
            Deferred onboarding allows sellers to start accepting payments immediately
            with minimal information (just their country), and complete full verification
            later after they've made sales.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
            <p className="text-blue-900 font-semibold">
              Key Benefit: Sellers are much more motivated to complete onboarding
              after they have pending earnings!
            </p>
          </div>
        </div>

        {/* The Flow */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            How It Works
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-4">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Create Minimal Account
                </h3>
                <p className="text-gray-700">
                  User clicks "Become a Seller" → Only asks for country →
                  Creates Stripe Express account with manual payouts
                </p>
                <code className="block mt-2 bg-gray-100 p-2 rounded text-sm text-gray-900">
                  POST /api/create-deferred-account
                </code>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-4">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Accept Payments
                </h3>
                <p className="text-gray-700">
                  Seller can immediately start selling → Platform holds payment →
                  Track pending earnings in database
                </p>
                <code className="block mt-2 bg-gray-100 p-2 rounded text-sm text-gray-900">
                  POST /api/create-deferred-payment
                </code>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mr-4">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Prompt for Onboarding
                </h3>
                <p className="text-gray-700">
                  After 3+ sales, show prominent "Complete Onboarding" banner →
                  Seller now has strong incentive (has money waiting!)
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold mr-4">
                4
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Transfer Pending Earnings
                </h3>
                <p className="text-gray-700">
                  Seller completes Stripe onboarding → Webhook detects verification →
                  Automatically transfer all pending earnings to seller
                </p>
                <code className="block mt-2 bg-gray-100 p-2 rounded text-sm text-gray-900">
                  Webhook: account.updated
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Key Files */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Key Implementation Files
          </h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📁</span>
              <div>
                <code className="text-blue-600 font-semibold">
                  /api/create-deferred-account/route.ts
                </code>
                <p className="text-sm text-gray-600">Creates minimal Express account</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-3">💳</span>
              <div>
                <code className="text-blue-600 font-semibold">
                  /api/create-deferred-payment/route.ts
                </code>
                <p className="text-sm text-gray-600">Handles payment for unverified sellers</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-3">🔔</span>
              <div>
                <code className="text-blue-600 font-semibold">
                  /api/webhooks/stripe/route.ts
                </code>
                <p className="text-sm text-gray-600">Tracks earnings & transfers on verification</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-3">🗄️</span>
              <div>
                <code className="text-blue-600 font-semibold">
                  /models/User.ts
                </code>
                <p className="text-sm text-gray-600">User schema with deferredOnboarding tracking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Getting Started
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>Clone this repository</li>
            <li>Copy <code className="bg-gray-100 px-2 py-1 rounded">.env.example</code> to <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code></li>
            <li>Add your Stripe test keys</li>
            <li>Set up MongoDB (local or Atlas)</li>
            <li>Run <code className="bg-gray-100 px-2 py-1 rounded">npm install</code></li>
            <li>Run <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code></li>
            <li>Set up Stripe webhook for local testing with Stripe CLI:
              <code className="block mt-2 bg-gray-100 p-3 rounded text-sm">
                stripe listen --forward-to localhost:3000/api/webhooks/stripe
              </code>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600">
          <p className="mb-2">
            Check out the{" "}
            <a
              href="https://github.com/yourusername/stripe-connect-deferred-onboarding-example-repo"
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              GitHub Repository
            </a>
          </p>
          <p>
            Based on the YouTube tutorial:{" "}
            <a
              href="https://www.youtube.com/watch?v=OVfEeuCt-kI"
              className="text-blue-600 hover:text-blue-800 font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe Connect Deferred Onboarding
            </a>
          </p>
          <p className="mt-4">
            <a
              href="https://speedbuildmarketplace.com"
              className="text-blue-600 hover:text-blue-800 font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              Speed Build Marketplace
            </a>
            {" · "}
            <a
              href="https://prometora.com"
              className="text-blue-600 hover:text-blue-800 font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              Prometora
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
