import Stripe from "stripe";

/**
 * Prefill on Stripe Accounts v2
 *
 * This file is documentation-as-code: it shows the same prefill pattern as
 * src/app/api/create-deferred-account/route.ts, expressed in Stripe's newer
 * Accounts v2 API. It is not wired into the app.
 *
 * Accounts v2 requires a newer stripe-node than the v17 pinned in this repo,
 * so the client is typed loosely here to keep the build green.
 *
 * v1 -> v2 field mapping:
 *
 * | v1                                  | v2                                            |
 * |-------------------------------------|-----------------------------------------------|
 * | business_type: "individual"         | identity.entity_type: "individual"            |
 * | individual.first_name / last_name   | identity.individual.given_name / surname      |
 * | country                             | identity.country                              |
 * | email                               | contact_email                                 |
 * | business_profile.url                | defaults.profile.business_url                 |
 * | business_profile.product_description| defaults.profile.product_description          |
 * | business_profile.mcc                | configuration.merchant.mcc                    |
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder"
) as any;

export async function createPrefilledAccountV2(
  email: string,
  country: string,
  firstName: string,
  lastName: string,
  marketplaceUrl: string,
  marketplaceName: string
) {
  const account = await stripe.v2.core.accounts.create({
    dashboard: "none",
    contact_email: email,
    identity: {
      country: country,
      entity_type: "individual",
      individual: {
        given_name: firstName,
        surname: lastName,
        email: email,
        address: { country: country },
      },
    },
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
      profile: {
        business_url: marketplaceUrl,
        product_description: `Products and services sold via ${marketplaceName}, an online marketplace.`,
      },
    },
    configuration: {
      merchant: {
        // card_payments is requested even though sellers never process cards:
        // some countries (notably the US) don't allow requesting transfers
        // without it. Prefilling the full merchant profile above is what keeps
        // this required-but-unused capability from generating extra
        // onboarding questions.
        capabilities: { card_payments: { requested: true } },
        mcc: "5734",
      },
      recipient: {
        capabilities: {
          stripe_balance: { stripe_transfers: { requested: true } },
        },
      },
    },
    include: ["configuration.merchant", "configuration.recipient", "identity"],
  });

  return account;
}
