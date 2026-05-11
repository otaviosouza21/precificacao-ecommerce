import { urlDeAutorizacao } from "@/lib/tiny/oauth";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    const state = crypto.randomUUID();
    const url = urlDeAutorizacao(state);
    const res = NextResponse.redirect(url);
    res.cookies.set("tiny_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    const destino = new URL(
      "/produtos/relatorios/custos?erro=" + encodeURIComponent(msg),
      process.env.TINY_REDIRECT_URI || "http://localhost:3000"
    );
    return NextResponse.redirect(destino);
  }
}
