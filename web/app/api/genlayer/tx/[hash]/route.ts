export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

type RouteProps = {
  params: Promise<{ hash: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteProps) {
  try {
    const { getMarketTransaction } = await import("../../../../../lib/genlayer");
    const { hash } = await params;
    const transaction = await getMarketTransaction(hash);
    return NextResponse.json({ ok: true, transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
