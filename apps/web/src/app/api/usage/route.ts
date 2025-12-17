import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { trackUsage, getMonthlyUsage, checkUsageLimit, type UsageType } from "@/lib/usage";
import { createDb, subscriptions } from "@launcher/db";
import { PRICING_TIERS } from "@/lib/pricing";

const db = createDb(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getMonthlyUsage(user.id);
    
    // Get user's subscription tier
    const subscription = await db.query.subscriptions.findFirst({
      where: (sub, { eq }) => eq(sub.userId, user.id),
    });
    
    const tier = subscription?.tier || "free";
    const tierConfig = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];

    return NextResponse.json({
      usage,
      limits: tierConfig.limits,
      tier,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, count = 1, metadata } = body as {
      type: UsageType;
      count?: number;
      metadata?: Record<string, unknown>;
    };

    if (!type || !["ai_query", "ai_embedding", "plugin_install", "search"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid usage type" },
        { status: 400 }
      );
    }

    // Get user's subscription tier
    const subscription = await db.query.subscriptions.findFirst({
      where: (sub, { eq }) => eq(sub.userId, user.id),
    });
    
    const tier = subscription?.tier || "free";
    const tierConfig = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];

    // Check if user has remaining quota
    const limitCheck = await checkUsageLimit(user.id, type, tierConfig.limits);
    
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Usage limit exceeded",
          remaining: 0,
          limit: tierConfig.limits,
        },
        { status: 429 }
      );
    }

    // Track the usage
    await trackUsage(user.id, type, count, metadata);

    return NextResponse.json({
      success: true,
      remaining: limitCheck.remaining === -1 ? -1 : limitCheck.remaining - count,
    });
  } catch (error) {
    console.error("Error tracking usage:", error);
    return NextResponse.json(
      { error: "Failed to track usage" },
      { status: 500 }
    );
  }
}
