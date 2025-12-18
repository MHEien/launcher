import { NextResponse } from "next/server";
import { builtinTools } from "@/lib/ai/tools";

export async function GET() {
  return NextResponse.json({
    tools: builtinTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      source: t.source,
    })),
  });
}

