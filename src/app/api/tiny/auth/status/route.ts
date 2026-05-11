import { getTokenStore } from "@/lib/tiny/token-store";
import { StatusAuth } from "@/lib/tiny/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tokens = await getTokenStore().ler();
    if (!tokens) {
      const r: StatusAuth = { connected: false, reason: "no_tokens" };
      return NextResponse.json(r);
    }
    const agora = Date.now();
    if (tokens.refreshExpiresAt <= agora) {
      const r: StatusAuth = { connected: false, reason: "refresh_expired" };
      return NextResponse.json(r);
    }
    const r: StatusAuth = {
      connected: true,
      accessExpiresAt: tokens.accessExpiresAt,
      refreshExpiresAt: tokens.refreshExpiresAt,
      precisaRelogarEm: tokens.refreshExpiresAt - agora,
    };
    return NextResponse.json(r);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ connected: false, reason: "no_tokens", erro: msg }, { status: 500 });
  }
}
