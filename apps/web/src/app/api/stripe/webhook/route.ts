import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createDb, subscriptions, sql, type subscriptionTierEnum } from "@launcher/db";

type SubscriptionTier = typeof subscriptionTierEnum.enumValues[number];
import type Stripe from "stripe";

const db = createDb(process.env.DATABASE_URL!);

// Type helper for Stripe subscription with period dates
interface SubscriptionWithPeriod extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as "pro" | "pro_plus";

  if (!userId || !tier) {
    console.error("Missing userId or tier in session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Fetch the subscription to get period dates
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subData = stripeSubscription as unknown as SubscriptionWithPeriod;

  // Upsert subscription record
  await db
    .insert(subscriptions)
    .values({
      userId,
      tier: tier as SubscriptionTier,
      status: subData.status === "trialing" ? "trialing" : "active",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      cancelAtPeriodEnd: subData.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        tier: tier as SubscriptionTier,
        status: subData.status === "trialing" ? "trialing" : "active",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        currentPeriodStart: new Date(subData.current_period_start * 1000),
        currentPeriodEnd: new Date(subData.current_period_end * 1000),
        cancelAtPeriodEnd: subData.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });

  console.log(`Subscription created for user ${userId}: ${tier}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  const tier = subscription.metadata?.tier as "pro" | "pro_plus" | undefined;
  const subWithPeriod = subscription as unknown as SubscriptionWithPeriod;

  await db
    .update(subscriptions)
    .set({
      status: mapStripeStatus(subscription.status),
      tier: (tier || undefined) as SubscriptionTier | undefined,
      currentPeriodStart: new Date(subWithPeriod.current_period_start * 1000),
      currentPeriodEnd: new Date(subWithPeriod.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(sql`${subscriptions.stripeSubscriptionId} = ${subscription.id}`);

  console.log(`Subscription updated for user ${userId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // Downgrade to free tier
  await db
    .update(subscriptions)
    .set({
      tier: "free" as SubscriptionTier,
      status: "canceled",
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(sql`${subscriptions.stripeSubscriptionId} = ${subscription.id}`);

  console.log(`Subscription canceled for user ${userId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(sql`${subscriptions.stripeCustomerId} = ${customerId}`);

  console.log(`Payment failed for customer ${customerId}`);
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | "trialing" {
  switch (status) {
    case "active":
      return "active";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "past_due":
    case "incomplete":
      return "past_due";
    case "trialing":
      return "trialing";
    default:
      return "active";
  }
}
