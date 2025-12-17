import { NextResponse } from "next/server";
import { getStripePricing } from "@/lib/stripe-pricing";

export async function GET() {
  try {
    const tiers = await getStripePricing();
    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}
