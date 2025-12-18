import { NextResponse } from "next/server";
import { getModelsForTier, getDefaultModel } from "@/lib/ai/models";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  // Validate authentication
  const session = await getAuthUser();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const models = getModelsForTier(session.tier);
  const defaultModel = getDefaultModel(session.tier);

  return NextResponse.json({
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
      supportsTools: m.supportsTools,
    })),
    default: defaultModel.id,
    tier: session.tier,
  });
}

