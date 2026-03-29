export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { readMarket } = await import("../../../../lib/genlayer");
    const body = (await request.json()) as {
      functionName?: string;
      args?: unknown[];
    };
    const result = await readMarket(body.functionName || "", body.args || []);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
