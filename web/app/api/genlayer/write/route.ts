export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { writeMarket } = await import("../../../../lib/genlayer");
    const body = (await request.json()) as {
      functionName?: string;
      args?: unknown[];
    };
    const tx = await writeMarket(body.functionName || "", body.args || []);
    return NextResponse.json({ ok: true, tx });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
