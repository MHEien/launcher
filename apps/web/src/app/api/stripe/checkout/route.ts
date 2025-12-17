import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { stripe } from "@/lib/stripe";
import { PRICING_TIERS, type PricingTier, type BillingInterval } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tier, interval } = body as { tier: PricingTier; interval: BillingInterval };

    if (!tier || !interval) {
      return NextResponse.json({ error: "Missing tier or interval" }, { status: 400 });
    }

    const tierConfig = PRICING_TIERS[tier];
    if (!tierConfig || tier === "free") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (!tierConfig.priceId) {
      return NextResponse.json({ error: "Tier has no price" }, { status: 400 });
    }

    const priceId = tierConfig.priceId[interval] || tierConfig.priceId.monthly;

    // Check if user already has a Stripe customer ID
    // For now, we'll create a new customer each time (in production, store and reuse)
    const customer = await stripe.customers.create({
      email: user.primaryEmail || undefined,
      name: user.displayName || undefined,
      metadata: {
        userId: user.id,
      },
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/pricing?canceled=true`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          tier,
        },
      },
      metadata: {
        userId: user.id,
        tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
