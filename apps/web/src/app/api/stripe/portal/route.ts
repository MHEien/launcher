import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { stripe } from "@/lib/stripe";
import { createDb, subscriptions, sql } from "@launcher/db";

const db = createDb(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/handler/sign-in", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    }

    // Get user's subscription to find Stripe customer ID
    const userSubscription = await db.query.subscriptions.findFirst({
      where: (sub, { eq }) => eq(sub.userId, user.id),
    });

    if (!userSubscription?.stripeCustomerId) {
      return NextResponse.redirect(new URL("/app/pricing", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    }

    // Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userSubscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/dashboard/subscription`,
    });

    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.redirect(new URL("/app/dashboard/subscription?error=portal", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }
}
